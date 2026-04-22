import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color background = Color(0xFF07111E);
  static const Color surface = Color(0xFF0B1B30);
  static const Color surfaceAlt = Color(0xFF132844);
  static const Color surfaceSoft = Color(0xFF173355);
  static const Color line = Color(0xFF2D5478);
  static const Color sky = Color(0xFF77D8FF);
  static const Color signal = Color(0xFFF6A347);
  static const Color signalSoft = Color(0xFFF6C66B);
  static const Color ink = Color(0xFF07111E);
  static const Color smooth = Color(0xFF63D6AB);
  static const Color moderate = Color(0xFFF7BA5D);
  static const Color severe = Color(0xFFFF7B67);
  static const Color warning = Color(0xFFF1C56E);

  static ThemeData darkTheme() {
    const colorScheme = ColorScheme.dark(
      primary: sky,
      secondary: signal,
      surface: surface,
      onSurface: Colors.white,
      error: severe,
    );

    final baseTextTheme = GoogleFonts.spaceGroteskTextTheme(
      ThemeData.dark(useMaterial3: true).textTheme,
    );
    final textTheme = baseTextTheme
        .copyWith(
          displayLarge: baseTextTheme.displayLarge?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: -2.8,
            height: 0.95,
          ),
          displayMedium: baseTextTheme.displayMedium?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: -1.6,
            height: 0.98,
          ),
          headlineLarge: baseTextTheme.headlineLarge?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: -1.4,
          ),
          headlineMedium: baseTextTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: -1.2,
          ),
          headlineSmall: baseTextTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: -0.8,
          ),
          titleLarge: baseTextTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
          titleMedium: baseTextTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
          bodyLarge: baseTextTheme.bodyLarge?.copyWith(
            height: 1.5,
            letterSpacing: -0.1,
          ),
          bodyMedium: baseTextTheme.bodyMedium?.copyWith(
            height: 1.55,
            color: Colors.white.withValues(alpha: 0.78),
          ),
          bodySmall: baseTextTheme.bodySmall?.copyWith(
            height: 1.45,
            color: Colors.white.withValues(alpha: 0.6),
          ),
        )
        .apply(bodyColor: Colors.white, displayColor: Colors.white);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: Colors.transparent,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: textTheme.titleLarge?.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w700,
        ),
      ),
      textTheme: textTheme,
      cardTheme: const CardTheme(
        color: surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(28)),
          side: BorderSide(color: line),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceAlt,
        labelStyle: textTheme.bodySmall,
        hintStyle: textTheme.bodyMedium?.copyWith(
          color: Colors.white.withValues(alpha: 0.55),
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(22),
          borderSide: const BorderSide(color: line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(22),
          borderSide: const BorderSide(color: line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(22),
          borderSide: const BorderSide(color: sky, width: 1.4),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surfaceAlt.withValues(alpha: 0.94),
        indicatorColor: sky.withValues(alpha: 0.14),
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        height: 72,
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: sky);
          }
          return IconThemeData(color: Colors.white.withValues(alpha: 0.72));
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final base =
              textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600) ??
              const TextStyle();
          if (states.contains(WidgetState.selected)) {
            return base.copyWith(color: Colors.white);
          }
          return base.copyWith(color: Colors.white.withValues(alpha: 0.68));
        }),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: signal,
          foregroundColor: ink,
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18),
          textStyle: textTheme.titleMedium?.copyWith(
            color: ink,
            fontWeight: FontWeight.w700,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          side: BorderSide(color: Colors.white.withValues(alpha: 0.14)),
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18),
          textStyle: textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: Colors.white.withValues(alpha: 0.86),
          textStyle: textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: surfaceAlt,
      ),
      dividerColor: Colors.white.withValues(alpha: 0.08),
    );
  }

  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF07111E),
      Color(0xFF0A1D33),
      Color(0xFF14385C),
      Color(0xFF07111E),
    ],
  );
}
