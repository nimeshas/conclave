import Foundation

#if DEBUG
func debugLog(_ message: String) {
    print(message)
}

func debugLog(_ message: () -> String) {
    debugLog(message())
}
#else
func debugLog(_ message: String) { }
func debugLog(_ message: () -> String) { }
#endif
