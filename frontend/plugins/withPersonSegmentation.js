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

// Swift plugin code - VisionCamera v4 API (CORRECT)
// Key changes from broken version:
// 1. Subclass FrameProcessorPlugin (not FrameProcessorPluginBase protocol - doesn't exist!)
// 2. Override init(proxy:options:) and callback(_:withArguments:)
// 3. Instance methods, not static methods
const SWIFT_PLUGIN_CODE = `//
//  PersonSegmentationPlugin.swift
//  VideoBeautify
//
//  Native Frame Processor Plugin using Apple's Vision Framework
//  for real-time person segmentation (background blur/replacement)
//  
//  VisionCamera v4 API - subclasses FrameProcessorPlugin class
//

import Foundation
import Vision
import VisionCamera
import CoreImage
import AVFoundation
import Metal

@objc(PersonSegmentationFrameProcessorPlugin)
public class PersonSegmentationFrameProcessorPlugin: FrameProcessorPlugin {
    
    // Shared resources for performance
    private var segmentationRequest: VNGeneratePersonSegmentationRequest
    private var ciContext: CIContext
    
    // REQUIRED: VisionCamera v4 init method
    public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable: Any]! = [:]) {
        // Initialize segmentation request
        self.segmentationRequest = VNGeneratePersonSegmentationRequest()
        self.segmentationRequest.qualityLevel = .balanced
        self.segmentationRequest.outputPixelFormat = kCVPixelFormatType_OneComponent8
        
        // Initialize Core Image context with Metal for performance
        if let metalDevice = MTLCreateSystemDefaultDevice() {
            self.ciContext = CIContext(mtlDevice: metalDevice, options: [
                .cacheIntermediates: false,
                .allowLowPower: true
            ])
        } else {
            self.ciContext = CIContext(options: [.useSoftwareRenderer: false])
        }
        
        super.init(proxy: proxy, options: options)
        print("[PersonSegmentation] Plugin initialized")
    }
    
    // REQUIRED: VisionCamera v4 callback method
    public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable: Any]?) -> Any? {
        // Parse arguments from JavaScript
        guard let args = arguments else {
            return nil
        }
        
        let effectType = args["effectType"] as? String ?? "none"
        if effectType == "none" {
            return nil
        }
        
        let blurIntensity = args["blurIntensity"] as? Double ?? 50.0
        let backgroundColor = args["backgroundColor"] as? String ?? "#222222"
        
        // Get pixel buffer from frame
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(frame.buffer) else {
            return ["error": "No pixel buffer"]
        }
        
        // Lock pixel buffer for processing
        CVPixelBufferLockBaseAddress(pixelBuffer, CVPixelBufferLockFlags(rawValue: 0))
        defer {
            CVPixelBufferUnlockBaseAddress(pixelBuffer, CVPixelBufferLockFlags(rawValue: 0))
        }
        
        // Create CIImage from pixel buffer
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        
        // Create Vision request handler
        let requestHandler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: .up, options: [:])
        
        do {
            // Perform person segmentation
            try requestHandler.perform([self.segmentationRequest])
            
            guard let result = self.segmentationRequest.results?.first else {
                return nil
            }
            
            let maskPixelBuffer = result.pixelBuffer
            
            // Create mask CIImage and scale to match frame size
            var maskCIImage = CIImage(cvPixelBuffer: maskPixelBuffer)
            let scaleX = ciImage.extent.width / maskCIImage.extent.width
            let scaleY = ciImage.extent.height / maskCIImage.extent.height
            maskCIImage = maskCIImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
            
            var outputImage: CIImage
            
            if effectType == "blur" {
                // Background blur effect
                let blurRadius = (blurIntensity / 100.0) * 30.0
                let blurredImage = ciImage.applyingGaussianBlur(sigma: blurRadius).cropped(to: ciImage.extent)
                
                // Composite: sharp person over blurred background
                outputImage = blurredImage.applyingFilter("CIBlendWithMask", parameters: [
                    kCIInputBackgroundImageKey: ciImage,
                    kCIInputMaskImageKey: maskCIImage
                ])
                
            } else if effectType == "color" {
                // Background color replacement
                let bgColor = self.parseHexColor(backgroundColor)
                let colorImage = CIImage(color: bgColor).cropped(to: ciImage.extent)
                
                // Composite: person over solid color
                outputImage = colorImage.applyingFilter("CIBlendWithMask", parameters: [
                    kCIInputBackgroundImageKey: ciImage,
                    kCIInputMaskImageKey: maskCIImage
                ])
                
            } else {
                return nil
            }
            
            // Render processed image back to pixel buffer (in-place modification)
            self.ciContext.render(outputImage, to: pixelBuffer)
            
            return nil  // Frame is modified in-place
            
        } catch {
            print("[PersonSegmentation] Error: \\(error.localizedDescription)")
            return nil
        }
    }
    
    // Helper: Parse hex color string to CIColor
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

// Objective-C registration code - VisionCamera v4 API (CORRECT)
// Key fix: The macro is used DIRECTLY, not wrapped in @interface
const OBJC_REGISTRATION_CODE = `//
//  PersonSegmentationPluginRegistration.m
//  VideoBeautify
//
//  VisionCamera v4 plugin registration
//

#import <Foundation/Foundation.h>
#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>

// Import Swift bridging header
#if __has_include("VideoBeautify-Swift.h")
#import "VideoBeautify-Swift.h"
#elif __has_include(<VideoBeautify/VideoBeautify-Swift.h>)
#import <VideoBeautify/VideoBeautify-Swift.h>
#else
// Fallback for autogenerated header
@class PersonSegmentationFrameProcessorPlugin;
#endif

// VisionCamera v4 registration: Register 'segmentPerson' as the JS function name
// This macro registers the Swift class with the Frame Processor Plugin Registry
VISION_EXPORT_SWIFT_FRAME_PROCESSOR(PersonSegmentationFrameProcessorPlugin, segmentPerson)
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
      xcodeProject.addFramework('Metal.framework');
      console.log('[PersonSegmentation] Added frameworks');
    } catch (e) {
      console.log('[PersonSegmentation] Frameworks already added');
    }
    
    return config;
  });

  return config;
}

module.exports = withPersonSegmentation;
