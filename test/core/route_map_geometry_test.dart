import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:skyshake/src/core/route_map_geometry.dart';

void main() {
  group('unwrapRoutePoints', () {
    test(
      'keeps transpacific routes in one continuous world copy instead of snapping to map edges',
      () {
        final points = <LatLng>[
          const LatLng(37.6213, -122.3790),
          const LatLng(45.0, -145.0),
          const LatLng(52.0, -170.0),
          const LatLng(55.0, 178.0),
          const LatLng(48.0, 154.0),
          const LatLng(38.0, 130.0),
          const LatLng(31.1443, 121.8083),
        ];

        final unwrapped = unwrapRoutePoints(points);

        expect(unwrapped, hasLength(points.length));
        for (var index = 1; index < unwrapped.length; index += 1) {
          final longitudeDelta =
              (unwrapped[index].longitude - unwrapped[index - 1].longitude)
                  .abs();
          expect(longitudeDelta, lessThanOrEqualTo(180));
        }

        expect(unwrapped.first.longitude, closeTo(-122.3790, 0.001));
        expect(unwrapped.last.longitude, lessThan(-200));
      },
    );

    test('leaves intra-continental routes untouched', () {
      final points = <LatLng>[
        const LatLng(37.6213, -122.3790),
        const LatLng(39.0, -110.0),
        const LatLng(40.6413, -73.7781),
      ];

      expect(unwrapRoutePoints(points), points);
    });
  });

  group('alignPointToReferenceWorld', () {
    test(
      'moves arrival markers into the same pacific world copy as the route',
      () {
        final aligned = alignPointToReferenceWorld(
          const LatLng(31.1443, 121.8083),
          -180.0,
        );

        expect(aligned.longitude, closeTo(-238.1917, 0.001));
      },
    );
  });

  group('buildRouteMapLayout', () {
    test(
      'centers transpacific routes near the dateline instead of Greenwich',
      () {
        final layout = buildRouteMapLayout(<LatLng>[
          const LatLng(37.6213, -122.3790),
          const LatLng(45.0, -145.0),
          const LatLng(52.0, -170.0),
          const LatLng(55.0, 178.0),
          const LatLng(48.0, 154.0),
          const LatLng(38.0, 130.0),
          const LatLng(31.1443, 121.8083),
        ]);

        expect(layout.center.longitude.abs(), greaterThan(150));
        expect(layout.routePolyline, hasLength(7));
        expect(layout.routePolyline.last.longitude, lessThan(-200));
        expect(layout.zoom, lessThan(3.2));
      },
    );

    test('falls back cleanly for a single point', () {
      final layout = buildRouteMapLayout(const <LatLng>[
        LatLng(37.6213, -122.3790),
      ]);

      expect(layout.center.latitude, closeTo(37.6213, 0.0001));
      expect(layout.center.longitude, closeTo(-122.3790, 0.0001));
      expect(layout.routePolyline, hasLength(1));
      expect(layout.referenceLongitude, closeTo(-122.3790, 0.0001));
    });
  });
}
