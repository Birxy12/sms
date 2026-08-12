import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'theme/app_theme.dart';
import 'services/auth_service.dart';
import 'services/deep_link_service.dart';
import 'screens/login_screen.dart';
import 'screens/student_dashboard.dart';
import 'screens/admin_dashboard.dart';
import 'screens/results_screen.dart';
import 'screens/idcard_screen.dart';
import 'screens/cbt_exam_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const BDSApp());
}

class BDSApp extends StatefulWidget {
  const BDSApp({super.key});

  @override
  State<BDSApp> createState() => _BDSAppState();
}

class _BDSAppState extends State<BDSApp> {
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();
  final DeepLinkService _deepLinkService = DeepLinkService();

  @override
  void initState() {
    super.initState();
    // Initialize Deep Link Intent listener for bdsportal:// and web intents
    _deepLinkService.initDeepLinks((path) {
      if (path.isNotEmpty) {
        _navigatorKey.currentState?.pushNamed(path);
      }
    });
  }

  @override
  void dispose() {
    _deepLinkService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthService(),
      child: Consumer<AuthService>(
        builder: (context, auth, _) {
          return MaterialApp(
            title: 'BDSPORTAL',
            debugShowCheckedModeBanner: false,
            navigatorKey: _navigatorKey,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: ThemeMode.system,
            initialRoute: auth.isAuthenticated ? '/dashboard' : '/login',
            routes: {
              '/login': (context) => const LoginScreen(),
              '/dashboard': (context) => const StudentDashboard(),
              '/admin': (context) => const AdminDashboard(),
              '/results': (context) => const ResultsScreen(),
              '/idcard': (context) => const IDCardScreen(),
              '/cbt': (context) => const CBTExamScreen(),
            },
          );
        },
      ),
    );
  }
}
