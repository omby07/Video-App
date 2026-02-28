/**
 * Expo Config Plugin for Person Segmentation
 * 
 * This plugin injects the native iOS code for person segmentation
 * using Apple's Vision framework (VNGeneratePersonSegmentationRequest).
 * 
 * The plugin:
 * 1. Creates the Swift frame processor plugin files
 * 2. Adds them to the Xcode project
 * 3. Links required frameworks (Vision, CoreImage)
 */

const { withXcodeProject, withDangerousMod, IOSConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Swift plugin code
const SWIFT_PLUGIN_CODE = `//
//  PersonSegmentationPlugin.swift
//  VideoBeautify
//
//  Native Frame Processor Plugin using Apple's Vision Framework
//  for real-time person segmentation (background blur/replacement)
//

import Foundation
import Vision
import VisionCamera
import CoreImage
import AVFoundation

@objc(PersonSegmentationFrameProcessorPlugin)
public class PersonSegmentationFrameProcessorPlugin: FrameProcessorPlugin {
    
    // Segmentation request - reused for temporal smoothing
    private var segmentationRequest: VNGeneratePersonSegmentationRequest?
    
    // CIContext for GPU-accelerated rendering
    private var ciContext: CIContext?
    
    // Track if processing to avoid frame drops
    private var isProcessing = false
    
    public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable: Any]! = [:]) {
        super.init(proxy: proxy, options: options)
        
        // Initialize segmentation request with balanced quality for real-time
        segmentationRequest = VNGeneratePersonSegmentationRequest()
        segmentationRequest?.qualityLevel = .balanced
        segmentationRequest?.outputPixelFormat = kCVPixelFormatType_OneComponent8
        
        // Initialize CIContext with Metal for GPU acceleration
        if let metalDevice = MTLCreateSystemDefaultDevice() {
            ciContext = CIContext(mtlDevice: metalDevice, options: [
                .cacheIntermediates: false,
                .allowLowPower: true
            ])
        } else {
            ciContext = CIContext(options: [.useSoftwareRenderer: false])
        }
        
        print("[PersonSegmentation] Plugin initialized")
    }
    
    public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
        // Skip if already processing to maintain frame rate
        guard !isProcessing else {
            return ["skipped": true]
        }
        
        // Get effect parameters
        let effectType = arguments?["effectType"] as? String ?? "none"
        if effectType == "none" {
            return nil
        }
        
        let blurIntensity = arguments?["blurIntensity"] as? Double ?? 50.0
        let backgroundColor = arguments?["backgroundColor"] as? String ?? "#222222"
        
        isProcessing = true
        defer { isProcessing = false }
        
        // Get pixel buffer from frame - this CAN return nil
        let pixelBufferOpt: CVPixelBuffer? = CMSampleBufferGetImageBuffer(frame.buffer)
        guard let pixelBuffer = pixelBufferOpt else {
            return ["error": "No pixel buffer"]
        }
        
        // Lock pixel buffer for reading/writing
        CVPixelBufferLockBaseAddress(pixelBuffer, CVPixelBufferLockFlags(rawValue: 0))
        defer {
            CVPixelBufferUnlockBaseAddress(pixelBuffer, CVPixelBufferLockFlags(rawValue: 0))
        }
        
        // Create CIImage from pixel buffer (non-optional return)
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        
        // Create Vision request handler
        let requestHandler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .up, options: [:])
        
        do {
            // Perform person segmentation
            guard let request = segmentationRequest else {
                return ["error": "No request"]
            }
            
            try requestHandler.perform([request])
            
            // Get the segmentation mask
            guard let result = request.results?.first else {
                return ["error": "No segmentation result"]
            }
            
            // Get mask pixel buffer (non-optional property)
            let maskPixelBuffer = result.pixelBuffer
            
            // Create mask CIImage and scale to match frame size
            var maskCIImage = CIImage(cvPixelBuffer: maskPixelBuffer)
            
            let scaleX = ciImage.extent.width / maskCIImage.extent.width
            let scaleY = ciImage.extent.height / maskCIImage.extent.height
            maskCIImage = maskCIImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
            
            var outputImage: CIImage
            
            if effectType == "blur" {
                // Calculate blur radius (0-100 -> 0-30 sigma)
                let blurRadius = (blurIntensity / 100.0) * 30.0
                
                // Create blurred version of the image (non-optional return)
                let blurredImage = ciImage.applyingGaussianBlur(sigma: blurRadius)
                    .cropped(to: ciImage.extent)
                
                // Composite: Use mask to blend sharp person over blurred background
                // Mask: white = person (use original), black = background (use blurred)
                outputImage = blurredImage.applyingFilter("CIBlendWithMask", parameters: [
                    kCIInputBackgroundImageKey: ciImage,
                    kCIInputMaskImageKey: maskCIImage
                ])
                
            } else if effectType == "color" {
                // Parse background color
                let bgColor = parseHexColor(backgroundColor)
                
                // Create solid color background
                let colorImage = CIImage(color: bgColor).cropped(to: ciImage.extent)
                
                // Composite: Use mask to blend person over solid color
                outputImage = colorImage.applyingFilter("CIBlendWithMask", parameters: [
                    kCIInputBackgroundImageKey: ciImage,
                    kCIInputMaskImageKey: maskCIImage
                ])
                
            } else {
                return ["error": "Unknown effect type"]
            }
            
            // Render the output back to the original pixel buffer
            ciContext?.render(outputImage, to: pixelBuffer)
            
            return ["success": true, "effect": effectType]
            
        } catch {
            print("[PersonSegmentation] Error: \\(error.localizedDescription)")
            return ["error": error.localizedDescription]
        }
    }
    
    // Helper to parse hex color string
    private func parseHexColor(_ hex: String) -> CIColor {
        var hexString = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        
        if hexString.hasPrefix("#") {
            hexString.remove(at: hexString.startIndex)
        }
        
        var rgb: UInt64 = 0
        Scanner(string: hexString).scanHexInt64(&rgb)
        
        let r = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
        let g = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
        let b = CGFloat(rgb & 0x0000FF) / 255.0
        
        return CIColor(red: r, green: g, blue: b, alpha: 1.0)
    }
}
`;

// Objective-C registration code
const OBJC_REGISTRATION_CODE = `//
//  PersonSegmentationPluginRegistration.m
//  VideoBeautify
//

#import <Foundation/Foundation.h>
#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>

#if __has_include("VideoBeautify-Swift.h")
#import "VideoBeautify-Swift.h"
#elif __has_include(<VideoBeautify/VideoBeautify-Swift.h>)
#import <VideoBeautify/VideoBeautify-Swift.h>
#endif

@interface PersonSegmentationPluginRegistration : NSObject
@end

@implementation PersonSegmentationPluginRegistration

+ (void)load {
    [FrameProcessorPluginRegistry addFrameProcessorPlugin:@"segmentPerson"
                                          withInitializer:^FrameProcessorPlugin* (VisionCameraProxyHolder* proxy, NSDictionary* options) {
        return [[PersonSegmentationFrameProcessorPlugin alloc] initWithProxy:proxy withOptions:options];
    }];
}

@end
`;

function withPersonSegmentation(config) {
  // Step 1: Create native files
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      
      // Create PersonSegmentation folder
      const pluginDir = path.join(platformProjectRoot, 'PersonSegmentation');
      if (!fs.existsSync(pluginDir)) {
        fs.mkdirSync(pluginDir, { recursive: true });
      }
      
      // Write Swift plugin
      const swiftPath = path.join(pluginDir, 'PersonSegmentationPlugin.swift');
      fs.writeFileSync(swiftPath, SWIFT_PLUGIN_CODE);
      console.log('[PersonSegmentation] Created Swift plugin');
      
      // Write Objective-C registration
      const objcPath = path.join(pluginDir, 'PersonSegmentationPluginRegistration.m');
      fs.writeFileSync(objcPath, OBJC_REGISTRATION_CODE);
      console.log('[PersonSegmentation] Created Obj-C registration');
      
      return config;
    },
  ]);

  // Step 2: Add files to Xcode project
  config = withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const projectName = config.modRequest.projectName || 'VideoBeautify';
    
    // Get the main group
    const mainGroup = xcodeProject.getFirstProject().firstProject.mainGroup;
    
    // Add PersonSegmentation group if it doesn't exist
    let personSegGroup = xcodeProject.pbxGroupByName('PersonSegmentation');
    if (!personSegGroup) {
      personSegGroup = xcodeProject.addPbxGroup(
        ['PersonSegmentationPlugin.swift', 'PersonSegmentationPluginRegistration.m'],
        'PersonSegmentation',
        'PersonSegmentation'
      );
    }
    
    // Add source files to build phases
    const swiftFile = 'PersonSegmentation/PersonSegmentationPlugin.swift';
    const objcFile = 'PersonSegmentation/PersonSegmentationPluginRegistration.m';
    
    try {
      xcodeProject.addSourceFile(swiftFile, null, personSegGroup.uuid);
      xcodeProject.addSourceFile(objcFile, null, personSegGroup.uuid);
      console.log('[PersonSegmentation] Added files to Xcode project');
    } catch (e) {
      // Files may already be added
      console.log('[PersonSegmentation] Files already in project or error:', e.message);
    }
    
    // Add Vision framework
    try {
      xcodeProject.addFramework('Vision.framework');
      xcodeProject.addFramework('CoreImage.framework');
      console.log('[PersonSegmentation] Added frameworks');
    } catch (e) {
      console.log('[PersonSegmentation] Frameworks already added');
    }
    
    return config;
  });

  return config;
}

module.exports = withPersonSegmentation;
