//
//  CameraPreviewView.swift
//  VideoBeautifyNative
//
//  SwiftUI wrapper for displaying processed camera frames
//

import SwiftUI
import CoreImage

struct CameraPreviewView: View {
    @ObservedObject var cameraManager: CameraManager
    
    var body: some View {
        GeometryReader { geometry in
            if let ciImage = cameraManager.processedImage {
                Image(uiImage: convertToUIImage(ciImage, size: geometry.size))
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: geometry.size.width, height: geometry.size.height)
                    .clipped()
            } else {
                // Placeholder while camera initializes
                Color.black
                    .overlay(
                        VStack {
                            ProgressView()
                                .tint(.white)
                            Text("Starting camera...")
                                .foregroundColor(.gray)
                                .padding(.top, 8)
                        }
                    )
            }
        }
    }
    
    private func convertToUIImage(_ ciImage: CIImage, size: CGSize) -> UIImage {
        let context = CIContext(options: [.useSoftwareRenderer: false])
        
        // Calculate scale to fit view while maintaining aspect ratio
        let imageSize = ciImage.extent.size
        let scale = max(size.width / imageSize.width, size.height / imageSize.height)
        let scaledSize = CGSize(width: imageSize.width * scale, height: imageSize.height * scale)
        
        // Create CGImage
        guard let cgImage = context.createCGImage(ciImage, from: ciImage.extent) else {
            return UIImage()
        }
        
        return UIImage(cgImage: cgImage, scale: 1.0, orientation: .up)
    }
}

#Preview {
    CameraPreviewView(cameraManager: CameraManager())
}//
//  CameraPreviewView.swift
//  VideoBeautifyNative
//
//  Created by John Clifford on 7/3/2026.
//

