//
//  PersonSegmentationPlugin.swift
//  Video-Beautify
//
//  Native Frame Processor Plugin using Apple's Vision Framework
//  for real-time person segmentation (background blur/replacement)
//

import Foundation
import Vision
import VisionCamera
import CoreImage
import UIKit

@objc(PersonSegmentationPlugin)
public class PersonSegmentationPlugin: FrameProcessorPlugin {
    
    // Segmentation request - reused for performance
    private lazy var segmentationRequest: VNGeneratePersonSegmentationRequest = {
        let request = VNGeneratePersonSegmentationRequest()
        request.qualityLevel = .balanced // Good balance of speed and quality
        request.outputPixelFormat = kCVPixelFormatType_OneComponent8
        return request
    }()
    
    // CIContext for image processing
    private let ciContext = CIContext(options: [.useSoftwareRenderer: false])
    
    public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable: Any]! = [:]) {
        super.init(proxy: proxy, options: options)
    }
    
    public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
        // Get effect type from arguments
        let effectType = arguments?["effectType"] as? String ?? "none"
        let blurIntensity = arguments?["blurIntensity"] as? Double ?? 50.0
        let backgroundColor = arguments?["backgroundColor"] as? String ?? "#222222"
        
        guard effectType != "none" else {
            return nil
        }
        
        // Get pixel buffer from frame
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(frame.buffer) else {
            return nil
        }
        
        // Create CIImage from pixel buffer
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        
        // Run person segmentation
        let handler = VNImageRequestHandler(ciImage: ciImage, options: [:])
        
        do {
            try handler.perform([segmentationRequest])
            
            guard let result = segmentationRequest.results?.first,
                  let maskPixelBuffer = result.pixelBuffer else {
                return nil
            }
            
            // Create mask CIImage
            let maskImage = CIImage(cvPixelBuffer: maskPixelBuffer)
            
            // Scale mask to match original image size
            let scaleX = ciImage.extent.width / maskImage.extent.width
            let scaleY = ciImage.extent.height / maskImage.extent.height
            let scaledMask = maskImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
            
            var outputImage: CIImage
            
            if effectType == "blur" {
                // Apply blur to background
                let blurRadius = (blurIntensity / 100.0) * 30.0 // 0-30 blur range
                
                guard let blurredImage = ciImage.applyingGaussianBlur(sigma: blurRadius) else {
                    return nil
                }
                
                // Composite: person (sharp) over blurred background using mask
                outputImage = blurredImage.applyingFilter("CIBlendWithMask", parameters: [
                    kCIInputBackgroundImageKey: ciImage, // Original sharp person
                    kCIInputMaskImageKey: scaledMask
                ])
                
            } else if effectType == "color" {
                // Replace background with solid color
                let color = colorFromHex(backgroundColor)
                let colorImage = CIImage(color: color).cropped(to: ciImage.extent)
                
                // Composite: person over solid color using mask
                outputImage = colorImage.applyingFilter("CIBlendWithMask", parameters: [
                    kCIInputBackgroundImageKey: ciImage, // Original person
                    kCIInputMaskImageKey: scaledMask
                ])
                
            } else {
                return nil
            }
            
            // Render output back to pixel buffer
            ciContext.render(outputImage, to: pixelBuffer)
            
            return ["success": true, "effect": effectType]
            
        } catch {
            print("[PersonSegmentation] Error: \(error.localizedDescription)")
            return ["success": false, "error": error.localizedDescription]
        }
    }
    
    // Helper to convert hex color string to CIColor
    private func colorFromHex(_ hex: String) -> CIColor {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)
        
        let r = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
        let g = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
        let b = CGFloat(rgb & 0x0000FF) / 255.0
        
        return CIColor(red: r, green: g, blue: b)
    }
}
