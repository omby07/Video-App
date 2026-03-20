
//
//  CameraManager.swift
//  VideoBeautifyNative
//
//  Manages camera capture, person segmentation, effects rendering,
//  and video recording with effects applied.
//
//  FIXED: Recording now properly appends continuous frames
//

import AVFoundation
import Vision
import CoreImage
import Metal
import Photos
import Combine

class CameraManager: NSObject, ObservableObject {
    
    // MARK: - Published Properties
    @Published var previewLayer: AVCaptureVideoPreviewLayer?
    @Published var processedImage: CIImage?
    @Published var lastSavedURL: URL?
    @Published var isProcessing = false
    
    // Effect settings
    var blurEnabled = false
    var blurIntensity: Double = 50 // 0-100
    var touchUpEnabled = false
    var smoothingIntensity: Double = 30 // 0-100
    var brightnessAdjust: Double = 0 // -50 to +50
    
    // MARK: - Private Properties
    private let captureSession = AVCaptureSession()
    private let videoOutput = AVCaptureVideoDataOutput()
    private let audioOutput = AVCaptureAudioDataOutput()
    private let processingQueue = DispatchQueue(label: "com.videobeautify.processing", qos: .userInteractive)
    
    // Metal & Core Image
    private var metalDevice: MTLDevice?
    private var ciContext: CIContext!
    
    // Person Segmentation
    private lazy var segmentationRequest: VNGeneratePersonSegmentationRequest = {
        let request = VNGeneratePersonSegmentationRequest()
        request.qualityLevel = .balanced
        request.outputPixelFormat = kCVPixelFormatType_OneComponent8
        return request
    }()
    
    // Recording
    private var assetWriter: AVAssetWriter?
    private var videoInput: AVAssetWriterInput?
    private var audioInput: AVAssetWriterInput?
    private var pixelBufferAdaptor: AVAssetWriterInputPixelBufferAdaptor?
    private var isRecording = false
    private var recordingStartTime: CMTime?
    private var currentRecordingURL: URL?
    private var frameCount: Int = 0  // Debug: track frame count
    private var diagnosticFrameCount: Int = 0
    private var videoFrameNumber: Int = 0
    private let targetFrameRate: Double = 30.0
    
    // MARK: - Initialization
    override init() {
        super.init()
        setupMetal()
        setupCaptureSession()
    }
    
    private func setupMetal() {
        metalDevice = MTLCreateSystemDefaultDevice()
        if let device = metalDevice {
            ciContext = CIContext(mtlDevice: device, options: [
                .cacheIntermediates: false,
                .workingColorSpace: CGColorSpaceCreateDeviceRGB()
            ])
            print("[CameraManager] Metal context initialized")
        } else {
            ciContext = CIContext(options: [.useSoftwareRenderer: false])
            print("[CameraManager] Software context initialized")
        }
    }
    
    private func setupCaptureSession() {
        captureSession.beginConfiguration()
        captureSession.sessionPreset = .hd1920x1080
        
        // Add video input (front camera)
        guard let videoDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
              let videoInput = try? AVCaptureDeviceInput(device: videoDevice) else {
            print("[CameraManager] Failed to get video device")
            return
        }
        
        if captureSession.canAddInput(videoInput) {
            captureSession.addInput(videoInput)
        }
        
        // Add audio input
        if let audioDevice = AVCaptureDevice.default(for: .audio),
           let audioInput = try? AVCaptureDeviceInput(device: audioDevice) {
            if captureSession.canAddInput(audioInput) {
                captureSession.addInput(audioInput)
            }
        }
        
        // Configure video output
        videoOutput.setSampleBufferDelegate(self, queue: processingQueue)
        videoOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        videoOutput.alwaysDiscardsLateVideoFrames = true
        
        if captureSession.canAddOutput(videoOutput) {
            captureSession.addOutput(videoOutput)
        }
        
        // Configure audio output
        audioOutput.setSampleBufferDelegate(self, queue: processingQueue)
        if captureSession.canAddOutput(audioOutput) {
            captureSession.addOutput(audioOutput)
        }
        
        // Set video orientation
        if let connection = videoOutput.connection(with: .video) {
            connection.videoRotationAngle = 90 // Portrait
            connection.isVideoMirrored = true // Mirror for front camera
        }
        
        captureSession.commitConfiguration()
        print("[CameraManager] Capture session configured")
    }
    
    // MARK: - Session Control
    func startSession() {
        processingQueue.async { [weak self] in
            self?.captureSession.startRunning()
            print("[CameraManager] Session started")
        }
    }
    
    func stopSession() {
        processingQueue.async { [weak self] in
            self?.captureSession.stopRunning()
            print("[CameraManager] Session stopped")
        }
    }
    
    // MARK: - Recording
    func startRecording() {
        guard !isRecording else { return }
        
        let outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("mov")
        
        do {
            assetWriter = try AVAssetWriter(outputURL: outputURL, fileType: .mov)
            print("[CameraManager] Writer created, status: \(assetWriter!.status.rawValue)")
            
            // Video input settings - match camera output format
            let videoSettings: [String: Any] = [
                AVVideoCodecKey: AVVideoCodecType.h264,
                AVVideoWidthKey: 1080,
                AVVideoHeightKey: 1920,
                AVVideoCompressionPropertiesKey: [
                    AVVideoAverageBitRateKey: 10_000_000,
                    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                    AVVideoExpectedSourceFrameRateKey: 30
                ]
            ]
            
            videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
            videoInput?.expectsMediaDataInRealTime = true
            
            // Pixel buffer adaptor - IMPORTANT: use this pool for buffers
            let sourcePixelBufferAttributes: [String: Any] = [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
                kCVPixelBufferWidthKey as String: 1080,
                kCVPixelBufferHeightKey as String: 1920,
                kCVPixelBufferMetalCompatibilityKey as String: true
            ]
            
            pixelBufferAdaptor = AVAssetWriterInputPixelBufferAdaptor(
                assetWriterInput: videoInput!,
                sourcePixelBufferAttributes: sourcePixelBufferAttributes
            )
            
            if assetWriter!.canAdd(videoInput!) {
                assetWriter!.add(videoInput!)
            }
            
            // Audio input settings
            let audioSettings: [String: Any] = [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVNumberOfChannelsKey: 2,
                AVSampleRateKey: 44100,
                AVEncoderBitRateKey: 128000
            ]
            
            audioInput = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings)
            audioInput?.expectsMediaDataInRealTime = true
            
            if assetWriter!.canAdd(audioInput!) {
                assetWriter!.add(audioInput!)
            }
            
            // START THE WRITER immediately
            guard assetWriter!.startWriting() else {
                print("[CameraManager] Failed to start writing: \(assetWriter!.error?.localizedDescription ?? "unknown")")
                return
            }
            print("[CameraManager] startWriting() succeeded, status: \(assetWriter!.status.rawValue)")
            
            // Start session at time zero
            assetWriter!.startSession(atSourceTime: .zero)
            print("[CameraManager] startSession(atSourceTime: .zero) called")
            
            currentRecordingURL = outputURL
            isRecording = true
            recordingStartTime = nil
            frameCount = 0
            videoFrameNumber = 0

            print("[CameraManager] Recording started, writer status: \(assetWriter!.status.rawValue)")
        } catch {
            print("[CameraManager] Failed to create writer: \(error)")
        }
    }
    
    func stopRecording() {
        guard isRecording else { return }
        isRecording = false
        
        print("[CameraManager] Stopping recording. Total frames written: \(frameCount)")
        
        guard let writer = assetWriter else {
            print("[CameraManager] No writer to stop")
            return
        }
        
        print("[CameraManager] Writer status before stop: \(writer.status.rawValue)")
        
        // Only finalize if writer is in .writing state
        guard writer.status == .writing else {
            print("[CameraManager] Writer not in .writing state (status: \(writer.status.rawValue)), skipping finalize")
            // Cleanup
            assetWriter = nil
            videoInput = nil
            audioInput = nil
            pixelBufferAdaptor = nil
            return
        }
        
        videoInput?.markAsFinished()
        audioInput?.markAsFinished()
        print("[CameraManager] markAsFinished() called on inputs")
        
        writer.finishWriting { [weak self] in
            guard let self = self else { return }
            
            print("[CameraManager] finishWriting completed, status: \(writer.status.rawValue)")
            
            if let error = writer.error {
                print("[CameraManager] Recording error: \(error)")
                return
            }
            
            guard let url = self.currentRecordingURL else {
                print("[CameraManager] No recording URL")
                return
            }
            
            print("[CameraManager] Recording finished: \(url)")
            
            // Save to Photos
            PHPhotoLibrary.requestAuthorization { status in
                guard status == .authorized || status == .limited else {
                    print("[CameraManager] Photo library access denied: \(status)")
                    return
                }
                
                PHPhotoLibrary.shared().performChanges {
                    PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: url)
                } completionHandler: { success, error in
                    DispatchQueue.main.async {
                        if success {
                            print("[CameraManager] Video saved to Photos")
                            self.lastSavedURL = url
                        } else {
                            print("[CameraManager] Failed to save video: \(error?.localizedDescription ?? "unknown")")
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Frame Processing
    private func processFrame(_ sampleBuffer: CMSampleBuffer) -> CVPixelBuffer? {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
            return nil
        }
        
        // If no effects enabled, return original
        if !blurEnabled && !touchUpEnabled {
            return pixelBuffer
        }
        
        var ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        
        // Apply touch-up first (affects entire image)
        if touchUpEnabled {
            ciImage = applyTouchUp(to: ciImage)
        }
        
        // Apply background blur with person segmentation
        if blurEnabled {
            ciImage = applyBackgroundBlur(to: ciImage, originalBuffer: pixelBuffer)
        }
        
        // Render to new pixel buffer
        let width = CVPixelBufferGetWidth(pixelBuffer)
        let height = CVPixelBufferGetHeight(pixelBuffer)
        return renderToPixelBuffer(ciImage, width: width, height: height)
    }
    
    private func applyTouchUp(to image: CIImage) -> CIImage {
        var result = image
        
        // Smoothing (subtle blur for skin smoothing effect)
        if smoothingIntensity > 0 {
            let smoothingRadius = (smoothingIntensity / 100.0) * 4.0
            if let smoothed = result.applyingFilter("CIGaussianBlur", parameters: [
                kCIInputRadiusKey: smoothingRadius
            ]).cropped(to: result.extent) as CIImage? {
                // Blend 50% smoothed with original
                if let blended = smoothed.applyingFilter("CISourceOverCompositing", parameters: [
                    kCIInputBackgroundImageKey: result
                ]).applyingFilter("CIColorControls", parameters: [
                    kCIInputSaturationKey: 1.0
                ]) as CIImage? {
                    result = blended.cropped(to: image.extent)
                }
            }
        }
        
        // Brightness adjustment
        if brightnessAdjust != 0 {
            let brightnessValue = brightnessAdjust / 100.0
            result = result.applyingFilter("CIColorControls", parameters: [
                kCIInputBrightnessKey: brightnessValue
            ])
        }
        
        return result.cropped(to: image.extent)
    }
    
    private func applyBackgroundBlur(to image: CIImage, originalBuffer: CVPixelBuffer) -> CIImage {
        let requestHandler = VNImageRequestHandler(cvPixelBuffer: originalBuffer, orientation: .up, options: [:])
        
        do {
            try requestHandler.perform([segmentationRequest])
            
            guard let result = segmentationRequest.results?.first else {
                return image
            }
            
            let maskBuffer = result.pixelBuffer
            var maskImage = CIImage(cvPixelBuffer: maskBuffer)
            
            // Scale mask to match image size
            let scaleX = image.extent.width / maskImage.extent.width
            let scaleY = image.extent.height / maskImage.extent.height
            maskImage = maskImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
            
            // STEP 1: Feather the mask edges for natural hair/shoulder transitions
            // Apply Gaussian blur to the mask itself to soften hard edges
            // 5-6 pixel radius provides good softening without creating halos
            let maskFeatherRadius = 5.0
            maskImage = maskImage.applyingGaussianBlur(sigma: maskFeatherRadius)
                                 .cropped(to: image.extent)
            
            // STEP 2: Non-linear blur intensity mapping
            // Square root curve makes mid-range slider values more impactful
            // STEP 2A: Increased max from 35 to 45 for stronger portrait effect
            let maxBlurSigma = 45.0
            let normalizedIntensity = sqrt(blurIntensity / 100.0)  // Square root curve
            let blurRadius = normalizedIntensity * maxBlurSigma
            
            guard let blurredImage = image.applyingGaussianBlur(sigma: blurRadius)
                .cropped(to: image.extent) as CIImage? else {
                return image
            }
            
            // Composite: person (sharp) over blurred background
            // The feathered mask creates a gradual transition at edges
            let composited = image.applyingFilter("CIBlendWithMask", parameters: [
                kCIInputBackgroundImageKey: blurredImage,
                kCIInputMaskImageKey: maskImage
            ])
            
            return composited.cropped(to: image.extent)
            
        } catch {
            print("[CameraManager] Segmentation error: \(error)")
            return image
        }
    }
    
    // FIXED: Use adaptor's pixel buffer pool when recording
    private func renderToPixelBuffer(_ image: CIImage, width: Int, height: Int) -> CVPixelBuffer? {
        // Try to get buffer from adaptor's pool first (better for recording)
        if isRecording, let pool = pixelBufferAdaptor?.pixelBufferPool {
            var pixelBuffer: CVPixelBuffer?
            let status = CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &pixelBuffer)
            if status == kCVReturnSuccess, let buffer = pixelBuffer {
                ciContext.render(image, to: buffer)

                CVPixelBufferLockBaseAddress(buffer, .readOnly)
                CVPixelBufferUnlockBaseAddress(buffer, .readOnly)

                return buffer
            }
        }
        
        // Fallback: create new pixel buffer
        var pixelBuffer: CVPixelBuffer?
        let attrs: [String: Any] = [
            kCVPixelBufferCGImageCompatibilityKey as String: true,
            kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
            kCVPixelBufferMetalCompatibilityKey as String: true
        ]
        
        let status = CVPixelBufferCreate(
            kCFAllocatorDefault,
            width,
            height,
            kCVPixelFormatType_32BGRA,
            attrs as CFDictionary,
            &pixelBuffer
        )
        
        guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
            return nil
        }

        ciContext.render(image, to: buffer)

        CVPixelBufferLockBaseAddress(buffer, .readOnly)
        CVPixelBufferUnlockBaseAddress(buffer, .readOnly)

        return buffer
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate
extension CameraManager: AVCaptureVideoDataOutputSampleBufferDelegate, AVCaptureAudioDataOutputSampleBufferDelegate {
    
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        
        if output == videoOutput {guard let originalBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
            
            // DIAGNOSTIC: sample pixel data to verify frames are changing
            if isRecording {
                diagnosticFrameCount += 1

                if diagnosticFrameCount % 30 == 0 {
                    CVPixelBufferLockBaseAddress(originalBuffer, .readOnly)
                    if let baseAddress = CVPixelBufferGetBaseAddress(originalBuffer) {
                        let bytesPerRow = CVPixelBufferGetBytesPerRow(originalBuffer)
                        let height = CVPixelBufferGetHeight(originalBuffer)
                        let middleOffset = (height / 2) * bytesPerRow + (bytesPerRow / 2)

                        let samplePtr = baseAddress.advanced(by: middleOffset)
                        let sampleValue = samplePtr.load(as: UInt32.self)

                        print("[DIAG] Buffer: \(originalBuffer), pixel: \(String(format: "0x%08X", sampleValue))")
                    }
                    CVPixelBufferUnlockBaseAddress(originalBuffer, .readOnly)
                }
            }
            // Process video frame
            guard let processedBuffer = processFrame(sampleBuffer) else { return }
            
            // Update preview (always)
            let ciImage = CIImage(cvPixelBuffer: processedBuffer)
            DispatchQueue.main.async {
                self.processedImage = ciImage
            }
            
            // Write to recording if active - use PROCESSED buffer with effects
            if isRecording {
                writeProcessedFrame(processedBuffer)
            }
        
            
        } else if output == audioOutput && isRecording {
            writeAudioSample(sampleBuffer)
        }
    }
    private func writeRawCameraFrame(_ cameraBuffer: CVPixelBuffer) {
        guard let writer = assetWriter,
              let input = videoInput,
              let adaptor = pixelBufferAdaptor,
              writer.status == .writing,
              input.isReadyForMoreMediaData else {
            return
        }

        let presentationTime = CMTime(value: CMTimeValue(videoFrameNumber),
                                      timescale: CMTimeScale(targetFrameRate))

        if adaptor.append(cameraBuffer, withPresentationTime: presentationTime) {
            videoFrameNumber += 1
            frameCount += 1
            if frameCount % 30 == 0 {
                print("[DIAG-RAW] Written \(frameCount) raw frames")
            }
        }
    }
    
    // Write processed frame with effects to recording
    private func writeProcessedFrame(_ buffer: CVPixelBuffer) {
        guard let writer = assetWriter,
              let input = videoInput,
              let adaptor = pixelBufferAdaptor,
              writer.status == .writing,
              input.isReadyForMoreMediaData else {
            return
        }
        
        let presentationTime = CMTime(value: CMTimeValue(videoFrameNumber),
                                      timescale: CMTimeScale(targetFrameRate))
        
        if adaptor.append(buffer, withPresentationTime: presentationTime) {
            videoFrameNumber += 1
            frameCount += 1
            if frameCount % 30 == 0 {
                print("[PROCESSED] Written \(frameCount) frames with effects")
            }
        }
    }
    
    // FIXED: Deep copy pixel buffer to prevent overwrite before encoding
        private func writeVideoFrame(_ pixelBuffer: CVPixelBuffer, timestamp: CMTime) {
            guard let writer = assetWriter,
                  let input = videoInput,
                  let adaptor = pixelBufferAdaptor else {
                return
            }
            
            // Initialize writer on first frame
            if recordingStartTime == nil {
                recordingStartTime = timestamp
                
                guard writer.startWriting() else {
                    print("[CameraManager] Failed to start writing: \(writer.error?.localizedDescription ?? "unknown")")
                    return
                }
                writer.startSession(atSourceTime: timestamp)
                print("[CameraManager] Writer started at time: \(timestamp.seconds)")
            }
            
            // Check writer status
            guard writer.status == .writing else {
                print("[CameraManager] Writer not in writing state: \(writer.status.rawValue)")
                return
            }
            
            // Calculate presentation time relative to start
            let presentationTime = CMTimeSubtract(timestamp, recordingStartTime!)
            
            // Check if input is ready
            guard input.isReadyForMoreMediaData else {
                return
            }
            
            // CRITICAL FIX: Deep copy the pixel buffer before appending
            // This prevents the buffer from being overwritten before AVAssetWriter encodes it
            guard let copiedBuffer = deepCopyPixelBuffer(pixelBuffer) else {
                print("[CameraManager] Failed to copy pixel buffer")
                return
            }
            
            // Append the COPIED frame
            if adaptor.append(copiedBuffer, withPresentationTime: presentationTime) {
                frameCount += 1
                if frameCount % 30 == 0 {
                    print("[CameraManager] Written \(frameCount) frames, time: \(presentationTime.seconds)s")
                }
            } else {
                print("[CameraManager] Failed to append frame \(frameCount)")
            }
        }
    // Deep copy a pixel buffer to ensure frame data isn't overwritten
        private func deepCopyPixelBuffer(_ sourceBuffer: CVPixelBuffer) -> CVPixelBuffer? {
            let width = CVPixelBufferGetWidth(sourceBuffer)
            let height = CVPixelBufferGetHeight(sourceBuffer)
            let pixelFormat = CVPixelBufferGetPixelFormatType(sourceBuffer)
            
            // Create new pixel buffer
            var newBuffer: CVPixelBuffer?
            let attrs: [String: Any] = [
                kCVPixelBufferCGImageCompatibilityKey as String: true,
                kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
                kCVPixelBufferMetalCompatibilityKey as String: true
            ]
            
            let status = CVPixelBufferCreate(
                kCFAllocatorDefault,
                width,
                height,
                pixelFormat,
                attrs as CFDictionary,
                &newBuffer
            )
            
            guard status == kCVReturnSuccess, let destinationBuffer = newBuffer else {
                return nil
            }
            
            // Lock both buffers
            CVPixelBufferLockBaseAddress(sourceBuffer, .readOnly)
            CVPixelBufferLockBaseAddress(destinationBuffer, [])
            
            defer {
                CVPixelBufferUnlockBaseAddress(sourceBuffer, .readOnly)
                CVPixelBufferUnlockBaseAddress(destinationBuffer, [])
            }
            
            // Copy plane by plane (handles both planar and non-planar formats)
            let planeCount = CVPixelBufferGetPlaneCount(sourceBuffer)
            
            if planeCount == 0 {
                // Non-planar format (e.g., BGRA)
                guard let srcBase = CVPixelBufferGetBaseAddress(sourceBuffer),
                      let dstBase = CVPixelBufferGetBaseAddress(destinationBuffer) else {
                    return nil
                }
                
                let srcBytesPerRow = CVPixelBufferGetBytesPerRow(sourceBuffer)
                let dstBytesPerRow = CVPixelBufferGetBytesPerRow(destinationBuffer)
                
                if srcBytesPerRow == dstBytesPerRow {
                    // Same row size - single memcpy
                    let totalBytes = srcBytesPerRow * height
                    memcpy(dstBase, srcBase, totalBytes)
                } else {
                    // Different row sizes - copy row by row
                    for row in 0..<height {
                        let srcRow = srcBase.advanced(by: row * srcBytesPerRow)
                        let dstRow = dstBase.advanced(by: row * dstBytesPerRow)
                        memcpy(dstRow, srcRow, min(srcBytesPerRow, dstBytesPerRow))
                    }
                }
            } else {
                // Planar format (e.g., YUV)
                for plane in 0..<planeCount {
                    guard let srcBase = CVPixelBufferGetBaseAddressOfPlane(sourceBuffer, plane),
                          let dstBase = CVPixelBufferGetBaseAddressOfPlane(destinationBuffer, plane) else {
                        continue
                    }
                    
                    let srcBytesPerRow = CVPixelBufferGetBytesPerRowOfPlane(sourceBuffer, plane)
                    let dstBytesPerRow = CVPixelBufferGetBytesPerRowOfPlane(destinationBuffer, plane)
                    let planeHeight = CVPixelBufferGetHeightOfPlane(sourceBuffer, plane)
                    
                    if srcBytesPerRow == dstBytesPerRow {
                        let totalBytes = srcBytesPerRow * planeHeight
                        memcpy(dstBase, srcBase, totalBytes)
                    } else {
                        for row in 0..<planeHeight {
                            let srcRow = srcBase.advanced(by: row * srcBytesPerRow)
                            let dstRow = dstBase.advanced(by: row * dstBytesPerRow)
                            memcpy(dstRow, srcRow, min(srcBytesPerRow, dstBytesPerRow))
                        }
                    }
                }
            }
            
            return destinationBuffer
        }
    
    private func writeAudioSample(_ sampleBuffer: CMSampleBuffer) {
        guard let input = audioInput,
              let writer = assetWriter,
              recordingStartTime != nil,
              writer.status == .writing else {
            return
        }
        
        if input.isReadyForMoreMediaData {
            input.append(sampleBuffer)
        }
    }
}
