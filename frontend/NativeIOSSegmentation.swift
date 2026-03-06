//
//  NativeIOSSegmentation.swift
//
//  STANDALONE REFERENCE FILE
//  
//  This file contains the complete, working Swift code for person segmentation
//  using Apple's Vision framework. This is the same technology used by Zoom,
//  FaceTime, and Google Meet for background blur/replacement.
//
//  To use in a native iOS project:
//  1. Create a new Xcode project (iOS App, SwiftUI)
//  2. Copy the relevant classes into your project
//  3. Add camera permissions to Info.plist:
//     - NSCameraUsageDescription
//     - NSMicrophoneUsageDescription
//
//  Requirements:
//  - iOS 15.0+ (for VNGeneratePersonSegmentationRequest)
//  - Xcode 14+
//

import Foundation
import AVFoundation
import Vision
import CoreImage
import Metal
import UIKit

// MARK: - Background Effect Types

enum BackgroundEffect: Equatable {
    case none
    case blur(intensity: Float)      // 0-100
    case solidColor(UIColor)
    case image(CIImage)
    
    static func == (lhs: BackgroundEffect, rhs: BackgroundEffect) -> Bool {
        switch (lhs, rhs) {
        case (.none, .none): return true
        case (.blur(let a), .blur(let b)): return a == b
        case (.solidColor(let a), .solidColor(let b)): return a == b
        case (.image, .image): return true // Simplified comparison
        default: return false
        }
    }
}

// MARK: - Person Segmenter (Core ML Logic)

/// PersonSegmenter handles real-time person detection and background effects
/// using Apple's Vision framework.
///
/// Usage:
/// ```
/// let segmenter = PersonSegmenter()
/// let processedImage = segmenter.processFrame(
///     pixelBuffer: cameraFrame,
///     effect: .blur(intensity: 50)
/// )
/// ```
class PersonSegmenter {
    
    // MARK: - Properties
    
    /// Vision segmentation request - reused for performance
    private lazy var segmentationRequest: VNGeneratePersonSegmentationRequest = {
        let request = VNGeneratePersonSegmentationRequest()
        // Options: .fast (lower quality, faster), .balanced, .accurate (higher quality, slower)
        request.qualityLevel = .balanced
        request.outputPixelFormat = kCVPixelFormatType_OneComponent8
        return request
    }()
    
    /// Core Image context for GPU-accelerated rendering
    private let ciContext: CIContext
    
    /// Track processing to prevent frame drops
    private var isProcessing = false
    
    // MARK: - Initialization
    
    init() {
        // Use Metal for GPU acceleration (much faster than CPU)
        if let metalDevice = MTLCreateSystemDefaultDevice() {
            ciContext = CIContext(mtlDevice: metalDevice, options: [
                .cacheIntermediates: false,
                .allowLowPower: true
            ])
            print("[PersonSegmenter] Initialized with Metal GPU acceleration")
        } else {
            ciContext = CIContext(options: [.useSoftwareRenderer: false])
            print("[PersonSegmenter] Initialized with software renderer")
        }
    }
    
    // MARK: - Frame Processing
    
    /// Process a camera frame and apply background effects
    /// - Parameters:
    ///   - pixelBuffer: The camera frame (CVPixelBuffer from AVCaptureSession)
    ///   - effect: The background effect to apply
    /// - Returns: Processed CIImage with effect applied
    func processFrame(pixelBuffer: CVPixelBuffer, effect: BackgroundEffect) -> CIImage {
        let originalImage = CIImage(cvPixelBuffer: pixelBuffer)
        
        // Skip processing if no effect
        guard effect != .none else {
            return originalImage
        }
        
        // Skip if already processing (prevent frame drops)
        guard !isProcessing else {
            return originalImage
        }
        
        isProcessing = true
        defer { isProcessing = false }
        
        // Run person segmentation
        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, 
                                            orientation: .up, 
                                            options: [:])
        
        do {
            try handler.perform([segmentationRequest])
            
            guard let result = segmentationRequest.results?.first else {
                print("[PersonSegmenter] No segmentation results")
                return originalImage
            }
            
            // Get the segmentation mask
            let maskPixelBuffer = result.pixelBuffer
            var maskImage = CIImage(cvPixelBuffer: maskPixelBuffer)
            
            // Scale mask to match original image size
            let scaleX = originalImage.extent.width / maskImage.extent.width
            let scaleY = originalImage.extent.height / maskImage.extent.height
            maskImage = maskImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
            
            // Apply the selected effect
            switch effect {
            case .none:
                return originalImage
                
            case .blur(let intensity):
                return applyBackgroundBlur(
                    to: originalImage,
                    mask: maskImage,
                    intensity: intensity
                )
                
            case .solidColor(let color):
                return applyColorBackground(
                    to: originalImage,
                    mask: maskImage,
                    color: color
                )
                
            case .image(let backgroundImage):
                return applyImageBackground(
                    to: originalImage,
                    mask: maskImage,
                    background: backgroundImage
                )
            }
            
        } catch {
            print("[PersonSegmenter] Error: \(error.localizedDescription)")
            return originalImage
        }
    }
    
    // MARK: - Effect Implementations
    
    /// Apply Gaussian blur to background, keeping person sharp
    private func applyBackgroundBlur(to image: CIImage, 
                                      mask: CIImage, 
                                      intensity: Float) -> CIImage {
        // Convert intensity (0-100) to blur radius (0-30)
        let blurRadius = Double(intensity) / 100.0 * 30.0
        
        // Create blurred version of entire image
        let blurredImage = image
            .applyingGaussianBlur(sigma: blurRadius)
            .cropped(to: image.extent)
        
        // Composite using mask:
        // - Where mask is WHITE (person): show original sharp image
        // - Where mask is BLACK (background): show blurred image
        return blurredImage.applyingFilter("CIBlendWithMask", parameters: [
            kCIInputBackgroundImageKey: image,    // Sharp person
            kCIInputMaskImageKey: mask            // Person = white, BG = black
        ])
    }
    
    /// Replace background with solid color
    private func applyColorBackground(to image: CIImage, 
                                       mask: CIImage, 
                                       color: UIColor) -> CIImage {
        // Extract RGB components
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        color.getRed(&r, green: &g, blue: &b, alpha: &a)
        
        // Create solid color image
        let colorImage = CIImage(color: CIColor(red: r, green: g, blue: b, alpha: 1.0))
            .cropped(to: image.extent)
        
        // Composite: person over solid color
        return colorImage.applyingFilter("CIBlendWithMask", parameters: [
            kCIInputBackgroundImageKey: image,
            kCIInputMaskImageKey: mask
        ])
    }
    
    /// Replace background with custom image
    private func applyImageBackground(to image: CIImage, 
                                       mask: CIImage, 
                                       background: CIImage) -> CIImage {
        // Scale background to match frame size
        let scaledBackground = background
            .transformed(by: CGAffineTransform(
                scaleX: image.extent.width / background.extent.width,
                y: image.extent.height / background.extent.height
            ))
            .cropped(to: image.extent)
        
        // Composite: person over custom background
        return scaledBackground.applyingFilter("CIBlendWithMask", parameters: [
            kCIInputBackgroundImageKey: image,
            kCIInputMaskImageKey: mask
        ])
    }
    
    // MARK: - Utility
    
    /// Render a CIImage to a new CVPixelBuffer (for recording)
    func renderToPixelBuffer(_ image: CIImage, 
                             size: CGSize) -> CVPixelBuffer? {
        var pixelBuffer: CVPixelBuffer?
        
        let attrs: [String: Any] = [
            kCVPixelBufferCGImageCompatibilityKey as String: true,
            kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
            kCVPixelBufferMetalCompatibilityKey as String: true
        ]
        
        let status = CVPixelBufferCreate(
            kCFAllocatorDefault,
            Int(size.width),
            Int(size.height),
            kCVPixelFormatType_32BGRA,
            attrs as CFDictionary,
            &pixelBuffer
        )
        
        guard status == kCVReturnSuccess, let buffer = pixelBuffer else {
            return nil
        }
        
        ciContext.render(image, to: buffer)
        return buffer
    }
}

// MARK: - Camera Manager

/// CameraManager handles AVCaptureSession setup and frame processing
class CameraManager: NSObject, ObservableObject {
    
    // MARK: - Published Properties (for SwiftUI binding)
    
    @Published var currentFrame: CGImage?
    @Published var isRunning = false
    @Published var isRecording = false
    @Published var recordingDuration: TimeInterval = 0
    @Published var error: String?
    
    // MARK: - Camera Properties
    
    private let captureSession = AVCaptureSession()
    private let videoOutput = AVCaptureVideoDataOutput()
    private let audioOutput = AVCaptureAudioDataOutput()
    private let processingQueue = DispatchQueue(label: "com.app.camera.processing", qos: .userInteractive)
    
    private var currentCameraPosition: AVCaptureDevice.Position = .front
    private var videoDeviceInput: AVCaptureDeviceInput?
    
    // MARK: - Processing Properties
    
    private let segmenter = PersonSegmenter()
    private let ciContext = CIContext()
    
    // MARK: - Effect Properties
    
    var backgroundEffect: BackgroundEffect = .none
    
    // MARK: - Recording Properties
    
    private var assetWriter: AVAssetWriter?
    private var videoWriterInput: AVAssetWriterInput?
    private var audioWriterInput: AVAssetWriterInput?
    private var pixelBufferAdaptor: AVAssetWriterInputPixelBufferAdaptor?
    private var recordingStartTime: CMTime?
    private var recordingTimer: Timer?
    
    // MARK: - Setup
    
    func setupCamera() {
        captureSession.beginConfiguration()
        captureSession.sessionPreset = .hd1920x1080
        
        // Setup video input (camera)
        setupVideoInput(position: currentCameraPosition)
        
        // Setup audio input (microphone)
        setupAudioInput()
        
        // Setup video output
        videoOutput.setSampleBufferDelegate(self, queue: processingQueue)
        videoOutput.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]
        videoOutput.alwaysDiscardsLateVideoFrames = true
        
        if captureSession.canAddOutput(videoOutput) {
            captureSession.addOutput(videoOutput)
        }
        
        // Setup audio output
        audioOutput.setSampleBufferDelegate(self, queue: processingQueue)
        if captureSession.canAddOutput(audioOutput) {
            captureSession.addOutput(audioOutput)
        }
        
        // Fix video orientation
        if let connection = videoOutput.connection(with: .video) {
            if connection.isVideoRotationAngleSupported(90) {
                connection.videoRotationAngle = 90
            }
            if connection.isVideoMirroringSupported {
                connection.isVideoMirrored = (currentCameraPosition == .front)
            }
        }
        
        captureSession.commitConfiguration()
    }
    
    private func setupVideoInput(position: AVCaptureDevice.Position) {
        // Remove existing input
        if let existingInput = videoDeviceInput {
            captureSession.removeInput(existingInput)
        }
        
        // Find camera
        guard let camera = AVCaptureDevice.default(
            .builtInWideAngleCamera,
            for: .video,
            position: position
        ) else {
            DispatchQueue.main.async {
                self.error = "Camera not found"
            }
            return
        }
        
        do {
            let input = try AVCaptureDeviceInput(device: camera)
            if captureSession.canAddInput(input) {
                captureSession.addInput(input)
                videoDeviceInput = input
            }
        } catch {
            DispatchQueue.main.async {
                self.error = "Camera setup error: \(error.localizedDescription)"
            }
        }
    }
    
    private func setupAudioInput() {
        guard let microphone = AVCaptureDevice.default(for: .audio) else {
            print("[CameraManager] Microphone not found")
            return
        }
        
        do {
            let audioInput = try AVCaptureDeviceInput(device: microphone)
            if captureSession.canAddInput(audioInput) {
                captureSession.addInput(audioInput)
            }
        } catch {
            print("[CameraManager] Microphone setup error: \(error)")
        }
    }
    
    // MARK: - Camera Control
    
    func start() {
        processingQueue.async { [weak self] in
            self?.captureSession.startRunning()
            DispatchQueue.main.async {
                self?.isRunning = true
            }
        }
    }
    
    func stop() {
        captureSession.stopRunning()
        DispatchQueue.main.async {
            self.isRunning = false
        }
    }
    
    func flipCamera() {
        captureSession.beginConfiguration()
        currentCameraPosition = (currentCameraPosition == .front) ? .back : .front
        setupVideoInput(position: currentCameraPosition)
        
        // Update mirroring
        if let connection = videoOutput.connection(with: .video) {
            if connection.isVideoMirroringSupported {
                connection.isVideoMirrored = (currentCameraPosition == .front)
            }
        }
        
        captureSession.commitConfiguration()
    }
    
    // MARK: - Recording
    
    func startRecording() {
        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let videoURL = documentsPath.appendingPathComponent("recording_\(Date().timeIntervalSince1970).mp4")
        
        do {
            assetWriter = try AVAssetWriter(outputURL: videoURL, fileType: .mp4)
            
            // Video input settings
            let videoSettings: [String: Any] = [
                AVVideoCodecKey: AVVideoCodecType.h264,
                AVVideoWidthKey: 1920,
                AVVideoHeightKey: 1080,
                AVVideoCompressionPropertiesKey: [
                    AVVideoAverageBitRateKey: 10_000_000,
                    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
                ]
            ]
            
            videoWriterInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
            videoWriterInput?.expectsMediaDataInRealTime = true
            
            // Pixel buffer adaptor for processed frames
            let sourcePixelBufferAttributes: [String: Any] = [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
                kCVPixelBufferWidthKey as String: 1920,
                kCVPixelBufferHeightKey as String: 1080
            ]
            
            pixelBufferAdaptor = AVAssetWriterInputPixelBufferAdaptor(
                assetWriterInput: videoWriterInput!,
                sourcePixelBufferAttributes: sourcePixelBufferAttributes
            )
            
            if assetWriter!.canAdd(videoWriterInput!) {
                assetWriter!.add(videoWriterInput!)
            }
            
            // Audio input settings
            let audioSettings: [String: Any] = [
                AVFormatIDKey: kAudioFormatMPEG4AAC,
                AVSampleRateKey: 44100,
                AVNumberOfChannelsKey: 2,
                AVEncoderBitRateKey: 128000
            ]
            
            audioWriterInput = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings)
            audioWriterInput?.expectsMediaDataInRealTime = true
            
            if assetWriter!.canAdd(audioWriterInput!) {
                assetWriter!.add(audioWriterInput!)
            }
            
            assetWriter!.startWriting()
            
            DispatchQueue.main.async {
                self.isRecording = true
                self.recordingDuration = 0
                self.recordingTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
                    self.recordingDuration += 1
                }
            }
            
        } catch {
            DispatchQueue.main.async {
                self.error = "Recording setup failed: \(error.localizedDescription)"
            }
        }
    }
    
    func stopRecording(completion: @escaping (URL?) -> Void) {
        guard let writer = assetWriter, writer.status == .writing else {
            completion(nil)
            return
        }
        
        recordingTimer?.invalidate()
        recordingTimer = nil
        
        videoWriterInput?.markAsFinished()
        audioWriterInput?.markAsFinished()
        
        writer.finishWriting { [weak self] in
            DispatchQueue.main.async {
                self?.isRecording = false
                
                if writer.status == .completed {
                    completion(writer.outputURL)
                } else {
                    self?.error = "Recording failed: \(writer.error?.localizedDescription ?? "Unknown error")"
                    completion(nil)
                }
            }
        }
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension CameraManager: AVCaptureVideoDataOutputSampleBufferDelegate, 
                          AVCaptureAudioDataOutputSampleBufferDelegate {
    
    func captureOutput(_ output: AVCaptureOutput,
                       didOutput sampleBuffer: CMSampleBuffer,
                       from connection: AVCaptureConnection) {
        
        // Handle audio
        if output == audioOutput {
            handleAudioFrame(sampleBuffer)
            return
        }
        
        // Handle video
        handleVideoFrame(sampleBuffer)
    }
    
    private func handleVideoFrame(_ sampleBuffer: CMSampleBuffer) {
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else {
            return
        }
        
        // Process frame with segmentation and effects
        let processedImage = segmenter.processFrame(
            pixelBuffer: pixelBuffer,
            effect: backgroundEffect
        )
        
        // Convert to CGImage for display
        if let cgImage = ciContext.createCGImage(processedImage, from: processedImage.extent) {
            DispatchQueue.main.async {
                self.currentFrame = cgImage
            }
        }
        
        // Write to recording if active
        if isRecording, let writer = assetWriter, writer.status == .writing {
            let timestamp = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
            
            // Start session on first frame
            if recordingStartTime == nil {
                recordingStartTime = timestamp
                writer.startSession(atSourceTime: timestamp)
            }
            
            // Write processed frame
            if let videoInput = videoWriterInput, videoInput.isReadyForMoreMediaData,
               let adaptor = pixelBufferAdaptor {
                
                if let outputBuffer = segmenter.renderToPixelBuffer(
                    processedImage,
                    size: CGSize(width: 1920, height: 1080)
                ) {
                    adaptor.append(outputBuffer, withPresentationTime: timestamp)
                }
            }
        }
    }
    
    private func handleAudioFrame(_ sampleBuffer: CMSampleBuffer) {
        if isRecording,
           let audioInput = audioWriterInput,
           audioInput.isReadyForMoreMediaData {
            audioInput.append(sampleBuffer)
        }
    }
}

// MARK: - SwiftUI Camera Preview View

#if canImport(SwiftUI)
import SwiftUI

/// SwiftUI view that displays the camera feed
struct CameraPreviewView: View {
    let cgImage: CGImage?
    
    var body: some View {
        GeometryReader { geometry in
            if let image = cgImage {
                Image(decorative: image, scale: 1.0)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: geometry.size.width, height: geometry.size.height)
                    .clipped()
            } else {
                Color.black
                    .overlay(
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    )
            }
        }
    }
}

/// Example usage in a SwiftUI app
struct ContentView: View {
    @StateObject private var cameraManager = CameraManager()
    @State private var blurIntensity: Float = 50
    @State private var effectType: Int = 0 // 0: none, 1: blur, 2: color
    
    var body: some View {
        ZStack {
            // Camera preview
            CameraPreviewView(cgImage: cameraManager.currentFrame)
                .ignoresSafeArea()
            
            // Controls overlay
            VStack {
                Spacer()
                
                // Effect picker
                Picker("Effect", selection: $effectType) {
                    Text("None").tag(0)
                    Text("Blur").tag(1)
                    Text("Color").tag(2)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                .background(Color.black.opacity(0.5))
                .cornerRadius(10)
                .onChange(of: effectType) { newValue in
                    switch newValue {
                    case 1:
                        cameraManager.backgroundEffect = .blur(intensity: blurIntensity)
                    case 2:
                        cameraManager.backgroundEffect = .solidColor(.blue)
                    default:
                        cameraManager.backgroundEffect = .none
                    }
                }
                
                // Blur intensity slider (when blur is selected)
                if effectType == 1 {
                    VStack {
                        Text("Blur: \(Int(blurIntensity))%")
                            .foregroundColor(.white)
                        Slider(value: $blurIntensity, in: 0...100)
                            .onChange(of: blurIntensity) { newValue in
                                cameraManager.backgroundEffect = .blur(intensity: newValue)
                            }
                    }
                    .padding()
                    .background(Color.black.opacity(0.5))
                    .cornerRadius(10)
                }
                
                // Record button
                Button(action: {
                    if cameraManager.isRecording {
                        cameraManager.stopRecording { url in
                            if let url = url {
                                print("Recording saved to: \(url)")
                            }
                        }
                    } else {
                        cameraManager.startRecording()
                    }
                }) {
                    Circle()
                        .fill(cameraManager.isRecording ? Color.red : Color.white)
                        .frame(width: 70, height: 70)
                        .overlay(
                            Circle()
                                .stroke(Color.white, lineWidth: 3)
                                .frame(width: 80, height: 80)
                        )
                }
                .padding(.bottom, 30)
            }
            .padding()
        }
        .onAppear {
            cameraManager.setupCamera()
            cameraManager.start()
        }
        .onDisappear {
            cameraManager.stop()
        }
    }
}
#endif

// MARK: - Info.plist Keys Required
/*
 Add these to your Info.plist:
 
 <key>NSCameraUsageDescription</key>
 <string>Record professional video introductions</string>
 
 <key>NSMicrophoneUsageDescription</key>
 <string>Record audio with your video</string>
 
 <key>NSPhotoLibraryUsageDescription</key>
 <string>Save your recorded videos</string>
*/
