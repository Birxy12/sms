/// Configuration for Firebase and Supabase backend services
class BackendConfig {
  // Firebase Configuration (School Poetal)
  static const String firebaseProjectId = "schoolpoetal";
  static const String firebaseApiKey = "AIzaSyCBEsjJYSh4mzzAxWTq_bJzmY5toswIHs4";
  static const String firebaseAuthDomain = "schoolpoetal.firebaseapp.com";
  static const String firebaseStorageBucket = "schoolpoetal.firebasestorage.app";
  static const String firebaseMessagingSenderId = "166284201380";
  static const String firebaseAppId = "1:166284201380:web:80ea79ae5ef592885d4531";

  // Firestore REST API Base URL
  static const String firestoreRestBaseUrl =
      "https://firestore.googleapis.com/v1/projects/$firebaseProjectId/databases/(default)/documents";

  // Supabase Configuration
  static const String supabaseUrl = "https://iqhppzndambyyskfwqyc.supabase.co";
  static const String supabaseAnonKey =
      "sb_publishable_wrIL11wNt-fsosehc7_toA_SoQpubnn";
}
