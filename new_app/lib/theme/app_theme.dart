import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Brand Colors
  static const Color primaryBlue = Color(0xFF4F46E5); // Indigo
  static const Color primaryDark = Color(0xFF0F172A); // Slate 900
  static const Color accentCyan = Color(0xFF06B6D4);  // Cyan
  static const Color emeraldGreen = Color(0xFF10B981); // Emerald
  static const Color amberOrange = Color(0xFFF59E0B); // Amber
  static const Color roseRed = Color(0xFFEF4444);     // Rose

  // Light Theme Palette
  static final ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: const ColorScheme.light(
      primary: primaryBlue,
      secondary: accentCyan,
      surface: Color(0xFFF8FAFC),
      error: roseRed,
      onPrimary: Colors.white,
      onSurface: Color(0xFF1E293B),
    ),
    scaffoldBackgroundColor: const Color(0xFFF8FAFC),
    textTheme: GoogleFonts.outfitTextTheme(ThemeData.light().textTheme),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 2,
      shadowColor: Colors.black.withOpacity(0.05),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    appBarTheme: AppBarTheme(
      elevation: 0,
      backgroundColor: Colors.white,
      foregroundColor: const Color(0xFF0F172A),
      titleTextStyle: GoogleFonts.outfit(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: const Color(0xFF0F172A),
      ),
    ),
  );

  // Dark Theme Palette
  static final ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: const ColorScheme.dark(
      primary: Color(0xFF6366F1),
      secondary: accentCyan,
      surface: Color(0xFF1E293B),
      error: roseRed,
      onPrimary: Colors.white,
      onSurface: Colors.white,
    ),
    scaffoldBackgroundColor: const Color(0xFF0F172A),
    textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme),
    cardTheme: CardThemeData(
      color: const Color(0xFF1E293B),
      elevation: 4,
      shadowColor: Colors.black.withOpacity(0.3),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    appBarTheme: AppBarTheme(
      elevation: 0,
      backgroundColor: const Color(0xFF1E293B),
      foregroundColor: Colors.white,
      titleTextStyle: GoogleFonts.outfit(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: Colors.white,
      ),
    ),
  );
}
