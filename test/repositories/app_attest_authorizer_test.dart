import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:skyshake/src/repositories/app_attest_authorizer.dart';

void main() {
  test('buildAppAttestPayload sorts request maps deterministically', () {
    expect(
      buildAppAttestPayload(
        challenge: 'challenge',
        method: 'post',
        path: '/v1/route-analysis/airports',
        query: const {},
        body: const {'departureCode': 'SFO', 'arrivalCode': 'JFK'},
      ),
      '{"body":{"arrivalCode":"JFK","departureCode":"SFO"},'
      '"challenge":"challenge","method":"POST",'
      '"path":"/v1/route-analysis/airports","query":{},"version":1}',
    );
  });

  test(
    'registers once and signs each protected request with a fresh challenge',
    () async {
      var challengeNumber = 0;
      final requests = <RequestOptions>[];
      final dio = Dio(
          BaseOptions(
            baseUrl: 'https://api.skyshake.example',
            validateStatus: (_) => true,
          ),
        )
        ..httpClientAdapter = _FakeHttpClientAdapter((options) {
          requests.add(options);
          if (options.path == '/v1/attestation/challenge') {
            challengeNumber += 1;
            return _jsonResponse(200, {
              'challenge': 'challenge-$challengeNumber',
              'expiresInSeconds': 120,
            });
          }
          if (options.path == '/v1/attestation/register') {
            return _jsonResponse(200, {'registered': true});
          }
          throw StateError('Unexpected request: ${options.path}');
        });
      final platform = _FakeAppAttestPlatform();
      final authorizer = AppAttestRequestAuthorizer(dio, platform: platform);

      final firstHeaders = await authorizer.authorize(
        method: 'POST',
        path: '/v1/route-analysis/airports',
        query: const {},
        body: const {'departureCode': 'SFO', 'arrivalCode': 'JFK'},
      );
      final secondHeaders = await authorizer.authorize(
        method: 'GET',
        path: '/v1/flights/search',
        query: const {'flightNumber': 'UA857'},
        body: null,
      );

      expect(platform.generatedKeys, 1);
      expect(platform.attestedChallenges, ['challenge-1']);
      expect(platform.persistedKeyId, 'key-1');
      expect(platform.assertedClientData, [
        buildAppAttestPayload(
          challenge: 'challenge-2',
          method: 'POST',
          path: '/v1/route-analysis/airports',
          query: const {},
          body: const {'departureCode': 'SFO', 'arrivalCode': 'JFK'},
        ),
        buildAppAttestPayload(
          challenge: 'challenge-3',
          method: 'GET',
          path: '/v1/flights/search',
          query: const {'flightNumber': 'UA857'},
          body: null,
        ),
      ]);
      expect(firstHeaders['X-SkyShake-Key-Id'], 'key-1');
      expect(firstHeaders['X-SkyShake-Challenge'], 'challenge-2');
      expect(secondHeaders['X-SkyShake-Challenge'], 'challenge-3');
      expect(
        requests.where((request) => request.path.endsWith('/register')),
        hasLength(1),
      );
    },
  );
}

class _FakeAppAttestPlatform implements AppAttestPlatform {
  String? persistedKeyId;
  int generatedKeys = 0;
  final attestedChallenges = <String>[];
  final assertedClientData = <String>[];

  @override
  Future<bool> isSupported() async => true;

  @override
  Future<String?> storedKeyId() async => persistedKeyId;

  @override
  Future<String> generateKey() async {
    generatedKeys += 1;
    return 'key-$generatedKeys';
  }

  @override
  Future<String> attestKey({
    required String keyId,
    required String challenge,
  }) async {
    attestedChallenges.add(challenge);
    return base64Encode(utf8.encode('attestation'));
  }

  @override
  Future<String> generateAssertion({
    required String keyId,
    required String clientData,
  }) async {
    assertedClientData.add(clientData);
    return base64Encode(utf8.encode('assertion'));
  }

  @override
  Future<void> storeKeyId(String keyId) async {
    persistedKeyId = keyId;
  }

  @override
  Future<void> clearKeyId() async {
    persistedKeyId = null;
  }
}

class _FakeHttpClientAdapter implements HttpClientAdapter {
  _FakeHttpClientAdapter(this.handler);

  final ResponseBody Function(RequestOptions options) handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _jsonResponse(int statusCode, Map<String, dynamic> payload) {
  return ResponseBody.fromString(
    jsonEncode(payload),
    statusCode,
    headers: {
      Headers.contentTypeHeader: ['application/json'],
    },
  );
}
