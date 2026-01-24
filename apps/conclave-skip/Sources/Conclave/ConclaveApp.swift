import Foundation
import OSLog
import SwiftUI

/// A logger for the Conclave module.
let logger: Logger = Logger(subsystem: "com.acmvit.conclave", category: "Conclave")

/// The shared top-level view for the app, loaded from the platform-specific App delegates below.
public struct ConclaveRootView: View {
    @State var appState = AppState()

    public init() {
    }

    public var body: some View {
        ContentView(appState: appState)
            .task {
                logger.info("Skip app logs are viewable in the Xcode console for iOS; Android logs can be viewed in Studio or using adb logcat")
            }
    }
}

/// Global application delegate functions.
///
/// These functions can update a shared observable object to communicate app state changes to interested views.
public final class ConclaveAppDelegate: Sendable {
    public static let shared = ConclaveAppDelegate()

    init() {
    }

    public func onInit() {
        logger.debug("onInit")
    }

    public func onLaunch() {
        logger.debug("onLaunch")
        #if !SKIP
        FontRegistration.registerFonts()
        #endif
    }

    public func onResume() {
        logger.debug("onResume")
    }

    public func onPause() {
        logger.debug("onPause")
    }

    public func onStop() {
        logger.debug("onStop")
    }

    public func onDestroy() {
        logger.debug("onDestroy")
    }

    public func onLowMemory() {
        logger.debug("onLowMemory")
    }
}
