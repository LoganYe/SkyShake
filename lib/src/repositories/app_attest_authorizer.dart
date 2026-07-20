import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/services.dart';

import 'tracking_repository.dart';

abstract interface class RequestAuthorizer {
  Future<Map<String, String>> authorize({
    required String method,
    required String path,
    required Map<String, dynamic> query,
    required Object? body,
  });

  Future<void> invalidate();
}

abstract interface class AppAttestPlatform {
  Future<bool> isSupported();
  Future<String?> storedKeyId();
  Future<String> generateKey();
  Future<String> attestKey({required String keyId, required String challenge});
  Future<String> generateAssertion({
    required String keyId,
    required String clientData,
  });
  Future<void> storeKeyId(String keyId);
  Future<void> clearKeyId();
}

class MethodChannelAppAttestPlatform implements AppAttestPlatform {
  const MethodChannelAppAttestPlatform();

  static const _channel = MethodChannel('skyshake/app_attest');

  @override
  Future<bool> isSupported() async {
    return await _channel.invokeMethod<bool>('isSupported') ?? false;
  }

  @override
  Future<String?> storedKeyId() => _channel.invokeMethod<String>('storedKeyId');

  @override
  Future<String> generateKey() async {
    final keyId = await _channel.invokeMethod<String>('generateKey');
    if (keyId == null || keyId.isEmpty) {
      throw const TrackingException(
        'App Attest did not return a key identifier.',
        code: 'app_attestation_failed',
      );
    }
    return keyId;
  }

  @override
  Future<String> attestKey({
    required String keyId,
    required String challenge,
  }) async {
    final attestation = await _channel.invokeMethod<String>('attestKey', {
      'keyId': keyId,
      'challenge': challenge,
    });
    if (attestation == null || attestation.isEmpty) {
      throw const TrackingException(
        'App Attest did not return an attestation object.',
        code: 'app_attestation_failed',
      );
    }
    return attestation;
  }

  @override
  Future<String> generateAssertion({
    required String keyId,
    required String clientData,
  }) async {
    final assertion = await _channel.invokeMethod<String>('generateAssertion', {
      'keyId': keyId,
      'clientData': clientData,
    });
    if (assertion == null || assertion.isEmpty) {
      throw const TrackingException(
        'App Attest did not return an assertion object.',
        code: 'app_attestation_failed',
      );
    }
    return assertion;
  }

  @override
  Future<void> storeKeyId(String keyId) {
    return _channel.invokeMethod<void>('storeKeyId', {'keyId': keyId});
  }

  @override
  Future<void> clearKeyId() {
    return _channel.invokeMethod<void>('clearKeyId');
  }
}

class AppAttestRequestAuthorizer implements RequestAuthorizer {
  AppAttestRequestAuthorizer(
    this._dio, {
    AppAttestPlatform platform = const MethodChannelAppAttestPlatform(),
  }) : _platform = platform;

  final Dio _dio;
  final AppAttestPlatform _platform;
  Future<String>? _registration;

  @override
  Future<Map<String, String>> authorize({
    required String method,
    required String path,
    required Map<String, dynamic> query,
    required Object? body,
  }) async {
    try {
      final keyId = await _registeredKeyId();
      final challenge = await _issueChallenge();
      final clientData = buildAppAttestPayload(
        challenge: challenge,
        method: method,
        path: path,
        query: query,
        body: body,
      );
      final assertion = await _platform.generateAssertion(
        keyId: keyId,
        clientData: clientData,
      );
      return {
        'X-SkyShake-Key-Id': keyId,
        'X-SkyShake-Challenge': challenge,
        'X-SkyShake-Assertion': assertion,
      };
    } on TrackingException {
      rethrow;
    } on PlatformException catch (error) {
      throw TrackingException(
        'This app instance could not establish its required device identity.',
        code:
            error.code == 'APP_ATTEST_UNSUPPORTED'
                ? 'app_attestation_unsupported'
                : 'app_attestation_failed',
        retryable: error.code != 'APP_ATTEST_UNSUPPORTED',
      );
    }
  }

  @override
  Future<void> invalidate() async {
    _registration = null;
    try {
      await _platform.clearKeyId();
    } on PlatformException catch (error) {
      throw TrackingException(
        'This app instance could not reset its device identity.',
        code: 'app_attestation_failed',
        retryable: error.code != 'APP_ATTEST_UNSUPPORTED',
      );
    }
  }

  Future<String> _registeredKeyId() async {
    final existing = await _platform.storedKeyId();
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }

    final inProgress = _registration;
    if (inProgress != null) {
      return inProgress;
    }
    final registration = _register();
    _registration = registration;
    try {
      return await registration;
    } finally {
      _registration = null;
    }
  }

  Future<String> _register() async {
    if (!await _platform.isSupported()) {
      throw const TrackingException(
        'This device cannot establish the required App Attest identity.',
        code: 'app_attestation_unsupported',
      );
    }

    final challenge = await _issueChallenge();
    final keyId = await _platform.generateKey();
    final attestation = await _platform.attestKey(
      keyId: keyId,
      challenge: challenge,
    );
    final response = await _dio.post<dynamic>(
      '/v1/attestation/register',
      data: {
        'challenge': challenge,
        'keyId': keyId,
        'attestation': attestation,
      },
    );
    final payload = _jsonMap(response.data);
    if (response.statusCode != 200 || payload['registered'] != true) {
      throw TrackingException(
        payload['error']?.toString() ??
            'The backend rejected App Attest registration.',
        code: payload['code']?.toString() ?? 'app_attestation_failed',
      );
    }
    await _platform.storeKeyId(keyId);
    return keyId;
  }

  Future<String> _issueChallenge() async {
    final response = await _dio.get<dynamic>('/v1/attestation/challenge');
    final payload = _jsonMap(response.data);
    final challenge = payload['challenge']?.toString();
    if (response.statusCode != 200 || challenge == null || challenge.isEmpty) {
      throw TrackingException(
        payload['error']?.toString() ??
            'The backend did not issue an App Attest challenge.',
        code: payload['code']?.toString() ?? 'app_attestation_failed',
        retryable: response.statusCode != null && response.statusCode! >= 500,
      );
    }
    return challenge;
  }
}

String buildAppAttestPayload({
  required String challenge,
  required String method,
  required String path,
  required Map<String, dynamic> query,
  required Object? body,
}) {
  return jsonEncode(
    _canonicalize({
      'body': body,
      'challenge': challenge,
      'method': method.toUpperCase(),
      'path': path,
      'query': query,
      'version': 1,
    }),
  );
}

dynamic _canonicalize(dynamic value) {
  if (value is List) {
    return value.map(_canonicalize).toList(growable: false);
  }
  if (value is Map) {
    final keys = value.keys.map((key) => key.toString()).toList()..sort();
    return <String, dynamic>{
      for (final key in keys) key: _canonicalize(value[key]),
    };
  }
  return value;
}

Map<String, dynamic> _jsonMap(dynamic value) {
  if (value is Map<String, dynamic>) {
    return value;
  }
  if (value is Map) {
    return Map<String, dynamic>.from(value);
  }
  if (value is String && value.trim().isNotEmpty) {
    final decoded = jsonDecode(value);
    if (decoded is Map) {
      return Map<String, dynamic>.from(decoded);
    }
  }
  return const {};
}
