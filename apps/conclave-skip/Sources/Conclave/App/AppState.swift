import Observation
#if !SKIP
import SkipFuse
#endif

@MainActor
@Observable
final class AppState {
    var isAuthenticated = false
    var currentUser: User?

    struct User: Identifiable {
        let id: String
        let name: String?
        let email: String?
    }
}

#if !SKIP
extension AppState: ObservableObject {}
#endif
