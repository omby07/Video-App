
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
    
    // MARK: - Permissions
    func checkAndRequestPermissions(completion: @escaping (Bool) -> Void) {
        var cameraGranted = false
        var micGranted = false
        
        let group = DispatchGroup()
        
        // Check camera permission
        group.enter()
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            cameraGranted = true
            print("[CameraManager] Camera permission: already authorized")
            group.leave()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                cameraGranted = granted
                print("[CameraManager] Camera permission: \(granted ? "granted" : "denied")")
                group.leave()
            }
        default:
            print("[CameraManager] Camera permission: denied or restricted")
            group.leave()
        }
        
        // Check microphone permission
        group.enter()
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized:
            micGranted = true
            print("[CameraManager] Microphone permission: already authorized")
            group.leave()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .audio) { granted in
                micGranted = granted
                print("[CameraManager] Microphone permission: \(granted ? "granted" : "denied")")
                group.leave()
            }
        default:
            print("[CameraManager] Microphone permission: denied or restricted")
            group.leave()
        }
        
        group.notify(queue: .main) {
            let allGranted = cameraGranted && micGranted
            print("[CameraManager] All permissions granted: \(allGranted)")
            completion(allGranted)
        }
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
        print("[CameraManager] setupCaptureSession called")
        print("[CameraManager] setupCaptureSession video-only test")
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
        
        // Startup hang isolation: temporarily disable all audio setup.
        // This includes AVAudioSession config/activation, audio input, and audio output wiring.
        print("[CameraManager] audio setup temporarily disabled")
        
        // Configure video output
        videoOutput.setSampleBufferDelegate(self, queue: processingQueue)
        videoOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        videoOutput.alwaysDiscardsLateVideoFrames = true
        
        if captureSession.canAddOutput(videoOutput) {
            captureSession.addOutput(videoOutput)
        }
        
        // Set video orientation
        if let connection = videoOutput.connection(with: .video) {
            connection.videoRotationAngle = 90 // Portrait
            connection.isVideoMirrored = true // Mirror for front camera
        }
        
        captureSession.commitConfiguration()
        
        // CRITICAL DIAGNOSTIC: Verify final session state
        print("[CameraManager] === SESSION STATE AFTER CONFIG ===")
        print("[CameraManager] Inputs: \(captureSession.inputs.count)")
        for (index, input) in captureSession.inputs.enumerated() {
            if let deviceInput = input as? AVCaptureDeviceInput {
                print("[CameraManager]   Input[\(index)]: \(deviceInput.device.localizedName) (\(deviceInput.device.deviceType.rawValue))")
            }
        }
        print("[CameraManager] Outputs: \(captureSession.outputs.count)")
        for (index, output) in captureSession.outputs.enumerated() {
            let outputType = (output == videoOutput) ? "VIDEO" : (output == audioOutput) ? "AUDIO" : "OTHER"
            print("[CameraManager]   Output[\(index)]: \(outputType) - \(type(of: output))")
        }
        print("[CameraManager] === END SESSION STATE ===")
        print("[CameraManager] Capture session configured")
    }
    
    // MARK: - Session Control
    func startSession() {
        print("[CameraManager] startSession called")
        processingQueue.async { [weak self] in
            self?.captureSession.startRunning()
            print("[CameraManager] Session started")
        }
    }
    
    func stopSession() {
        print("[CameraManager] stopSession called")
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
            
            currentRecordingURL = outputURL
            isRecording = true
            recordingStartTime = nil  // Will be set on first video frame
            frameCount = 0
            videoFrameNumber = 0
            
            // NOTE: Do NOT call startWriting() or startSession() here.
            // They will be called on the first video frame to establish
            // a consistent timeline baseline for both video and audio.
            
            print("[CameraManager] Recording prepared: \(outputURL)")

        } catch {
            print("[CameraManager] Failed to start recording: \(error)")
        }
    }
    
    func stopRecording() {
        guard isRecording else { return }
        isRecording = false
        
        print("[CameraManager] Stopping recording. Total frames written: \(frameCount)")
        
        videoInput?.markAsFinished()
        audioInput?.markAsFinished()
        
        assetWriter?.finishWriting { [weak self] in
            guard let self = self, let url = self.currentRecordingURL else { return }
            
            if let error = self.assetWriter?.error {
                print("[CameraManager] Recording error: \(error)")
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
        
        // ==============================================
        // SOFT GLOW TECHNIQUE - Conservative V1
        // ==============================================
        // Goal: Subtle skin smoothing while preserving eyes,
        // eyebrows, lips, and hairline detail.
        //
        // Filter Chain:
        // 1. Create soft glow layer (light blur + slight lift)
        // 2. Create high-pass detail mask (edges to preserve)
        // 3. Blend soft layer with original, masked by detail
        // ==============================================
        
        if smoothingIntensity > 0 {
            let extent = image.extent
            
            // --- PARAMETERS (Conservative starting values) ---
            // Soft layer blur: max 5px at 100% intensity (very light)
            let softBlurRadius = (smoothingIntensity / 100.0) * 5.0
            
            // Detail mask blur: larger to capture edges broadly
            let detailBlurRadius: Double = 12.0
            
            // Blend amount: max 25% at full intensity (subtle)
            let blendAmount = (smoothingIntensity / 100.0) * 0.25
            
            // Detail mask contrast boost (higher = more detail preserved)
            let detailContrast: Double = 2.5
            
            // --- STEP 1: Create soft glow layer ---
            // Light Gaussian blur for skin smoothing
            let softLayer = image
                .applyingFilter("CIGaussianBlur", parameters: [
                    kCIInputRadiusKey: softBlurRadius
                ])
                .cropped(to: extent)
            
            // --- STEP 2: Create detail preservation mask (high-pass) ---
            // Heavy blur of original
            let heavyBlurred = image
                .applyingFilter("CIGaussianBlur", parameters: [
                    kCIInputRadiusKey: detailBlurRadius
                ])
                .cropped(to: extent)
            
            // Subtract blurred from original to get edges/details
            // Using CISubtractBlendMode: result = source - background
            // Then shift to 0.5 gray baseline and boost contrast
            let detailExtracted = image
                .applyingFilter("CISubtractBlendMode", parameters: [
                    kCIInputBackgroundImageKey: heavyBlurred
                ])
                .cropped(to: extent)
            
            // Convert detail map to usable mask:
            // - Boost contrast to make edges pop
            // - Invert so edges become DARK (protect) and flat areas WHITE (smooth)
            let detailMask = detailExtracted
                .applyingFilter("CIColorControls", parameters: [
                    kCIInputContrastKey: detailContrast,
                    kCIInputBrightnessKey: 0.5  // Shift baseline up
                ])
                .applyingFilter("CIColorInvert")  // Invert: edges=dark, smooth areas=light
                .cropped(to: extent)
            
            // --- STEP 3: Selective blend using mask ---
            // First, create the basic blend between original and soft layer
            let basicBlend = image
                .applyingFilter("CIDissolveTransition", parameters: [
                    kCIInputTargetImageKey: softLayer,
                    kCIInputTimeKey: blendAmount  // 0 = original, 1 = soft
                ])
                .cropped(to: extent)
            
            // Apply detail mask: where mask is dark (edges), keep original
            // where mask is light (smooth skin), use the blended result
            result = image
                .applyingFilter("CIBlendWithMask", parameters: [
                    kCIInputBackgroundImageKey: basicBlend,
                    kCIInputMaskImageKey: detailMask
                ])
                .cropped(to: extent)
        }
        
        // --- BRIGHTNESS ADJUSTMENT (Independent, unchanged) ---
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
            
            // Create blurred background
            let blurRadius = (blurIntensity / 100.0) * 25.0
            guard let blurredImage = image.applyingGaussianBlur(sigma: blurRadius)
                .cropped(to: image.extent) as CIImage? else {
                return image
            }
            
            // Composite: person (sharp) over blurred background
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

        if status != kCVReturnSuccess {
            return nil
        }

        if let buffer = pixelBuffer {
            ciContext.render(image, to: buffer)
            return buffer
        }

        return nil
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate
extension CameraManager: AVCaptureVideoDataOutputSampleBufferDelegate, AVCaptureAudioDataOutputSampleBufferDelegate {
    
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        
        // CRITICAL DIAGNOSTIC: Log EVERY callback to see what outputs are firing
        // This will be verbose but we need to know if audio callbacks happen at all
        let outputType = (output == videoOutput) ? "VIDEO" : (output == audioOutput) ? "AUDIO" : "UNKNOWN"
        
        // Log audio unconditionally (every callback), video only occasionally
        if output == audioOutput {
            print("[CALLBACK] \(outputType) output received")
        }
        
        if output == videoOutput {
            guard let originalBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
            
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
            
            // Write to recording if active
            if isRecording {
                let timestamp = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
                writeVideoFrame(processedBuffer, timestamp: timestamp)
            }
        
            
        } else if output == audioOutput {
            // DIAG: Log audio capture regardless of recording state
            if isRecording {
                print("[AUDIO-CAPTURE] Audio sample received while recording")
                writeAudioSample(sampleBuffer)
            } else {
                // Only log occasionally when not recording to avoid spam
            }
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
    
    // FIXED: Single initialization point with consistent zero-based timeline
        private func writeVideoFrame(_ pixelBuffer: CVPixelBuffer, timestamp: CMTime) {
            guard let writer = assetWriter,
                  let input = videoInput,
                  let adaptor = pixelBufferAdaptor else {
                return
            }
            
            // Initialize writer on first frame - single point of initialization
            if recordingStartTime == nil {
                recordingStartTime = timestamp  // Capture baseline for relative timing
                
                // Start writing and session at .zero for consistent timeline
                guard writer.startWriting() else {
                    print("[CameraManager] Failed to start writing: \(writer.error?.localizedDescription ?? "unknown")")
                    return
                }
                writer.startSession(atSourceTime: .zero)
                print("[CameraManager] Writer started. Baseline timestamp: \(timestamp.seconds)s")
            }
            
            // Check writer status
            guard writer.status == .writing else {
                print("[CameraManager] Writer not in writing state: \(writer.status.rawValue)")
                return
            }
            
            // Calculate presentation time relative to first frame (starts at 0)
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
    
    // FIXED: Adjust audio timestamps to match video timeline (zero-based)
    // DIAGNOSTIC: Added extensive logging to debug audio recording
    private func writeAudioSample(_ sampleBuffer: CMSampleBuffer) {
        // DIAG 1: Check basic guards
        guard let input = audioInput else {
            print("[AUDIO-DIAG] SKIP: audioInput is nil")
            return
        }
        
        guard let writer = assetWriter else {
            print("[AUDIO-DIAG] SKIP: assetWriter is nil")
            return
        }
        
        guard let startTime = recordingStartTime else {
            // This is expected for audio samples that arrive before first video frame
            print("[AUDIO-DIAG] SKIP: recordingStartTime not set yet (waiting for video)")
            return
        }
        
        guard writer.status == .writing else {
            print("[AUDIO-DIAG] SKIP: writer.status = \(writer.status.rawValue) (not writing)")
            return
        }
        
        guard input.isReadyForMoreMediaData else {
            print("[AUDIO-DIAG] SKIP: audioInput not ready for more data")
            return
        }
        
        // DIAG 2: Log timestamp info
        let originalTimestamp = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
        let adjustedTimestamp = CMTimeSubtract(originalTimestamp, startTime)
        
        // Log every 10th audio sample to avoid spam
        let sampleCount = CMSampleBufferGetNumSamples(sampleBuffer)
        print("[AUDIO-DIAG] Original: \(originalTimestamp.seconds)s, StartTime: \(startTime.seconds)s, Adjusted: \(adjustedTimestamp.seconds)s, Samples: \(sampleCount)")
        
        // Skip audio samples that arrived before video started (negative time)
        guard adjustedTimestamp.seconds >= 0 else {
            print("[AUDIO-DIAG] SKIP: Negative adjusted time (\(adjustedTimestamp.seconds)s)")
            return
        }
        
        // Create a copy of the sample buffer with adjusted timing
        var timingInfo = CMSampleTimingInfo(
            duration: CMSampleBufferGetDuration(sampleBuffer),
            presentationTimeStamp: adjustedTimestamp,
            decodeTimeStamp: .invalid
        )
        
        var adjustedBuffer: CMSampleBuffer?
        let status = CMSampleBufferCreateCopyWithNewTiming(
            allocator: kCFAllocatorDefault,
            sampleBuffer: sampleBuffer,
            sampleTimingEntryCount: 1,
            sampleTimingArray: &timingInfo,
            sampleBufferOut: &adjustedBuffer
        )
        
        if status == noErr, let buffer = adjustedBuffer {
            let appendSuccess = input.append(buffer)
            if appendSuccess {
                print("[AUDIO-DIAG] SUCCESS: Appended audio at \(adjustedTimestamp.seconds)s")
            } else {
                print("[AUDIO-DIAG] FAIL: append() returned false. Writer error: \(writer.error?.localizedDescription ?? "none")")
            }
        } else {
            print("[AUDIO-DIAG] FAIL: CMSampleBufferCreateCopyWithNewTiming failed with status \(status)")
        }
    }
}
