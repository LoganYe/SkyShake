import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color background = Color(0xFF07111F);
  static const Color surface = Color(0xFF0E1A2B);
  static const Color surfaceAlt = Color(0xFF13243B);
  static const Color line = Color(0xFF223C5C);
  static const Color sky = Color(0xFF45C7FF);
  static const Color smooth = Color(0xFF4DD4AC);
  static const Color moderate = Color(0xFFF5B94A);
  static const Color severe = Color(0xFFFF6C5C);
  static const Color warning = Color(0xFFD29922);

  static ThemeData darkTheme() {
    const colorScheme = ColorScheme.dark(
      primary: sky,
      secondary: smooth,
      surface: surface,
      onSurface: Colors.white,
      error: severe,
    );

    final textTheme = GoogleFonts.spaceGroteskTextTheme(
      ThemeData.dark(useMaterial3: true).textTheme,
    ).apply(bodyColor: Colors.white, displayColor: Colors.white);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: Colors.transparent,
      textTheme: textTheme,
      cardTheme: const CardTheme(
        color: surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(24)),
          side: BorderSide(color: line),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceAlt,
        hintStyle: textTheme.bodyMedium?.copyWith(
          color: Colors.white.withValues(alpha: 0.55),
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: const BorderSide(color: sky, width: 1.4),
        ),
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: surfaceAlt,
      ),
    );
  }

  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF061121), Color(0xFF09182C), Color(0xFF07111F)],
  );
}
