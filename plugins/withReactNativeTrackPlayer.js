const { withAndroidManifest, withPlugins } = require('@expo/config-plugins');

function withReactNativeTrackPlayer(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];
    if (!application) return config;

    const permissions = manifest.manifest['uses-permission'] || [];
    permissions.push(
      { $: { 'android:name': 'android.permission.FOREGROUND_SERVICE' } },
      { $: { 'android:name': 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK' } },
      { $: { 'android:name': 'android.permission.POST_NOTIFICATIONS' } }
    );
    manifest.manifest['uses-permission'] = permissions;

    const services = application['service'] || [];
    services.push({
      $: {
        'android:name': 'com.doublesymmetry.trackplayer.service.MusicService',
        'android:exported': 'false',
        'android:foregroundServiceType': 'mediaPlayback',
      },
      'intent-filter': [
        {
          'action': [{ $: { 'android:name': 'androidx.media3.session.MediaSessionService' } }],
        },
      ],
    });
    application['service'] = services;

    return config;
  });
}

module.exports = withReactNativeTrackPlayer;
