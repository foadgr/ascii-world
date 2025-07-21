## Aniso

An open-source ASCII tool built by darkroom.engineering to generate and customize character-based imagery.

<br/>

## Features

- Granularity control
- Character limit
- Character picker
- Image color overwrite
- Image drop support
- Exporter
- **Hand tracking with depth control** - Use your hand to control granularity in real-time
- Camera integration for live video processing

<br/>

## Hand Tracking

The hand tracking feature uses MediaPipe to detect your hand and control the ASCII granularity based on hand depth:

1. **Enable Camera**: Click "start camera" to begin video capture
2. **Enable Hand Tracking**: Toggle "hand tracking" in the controls
3. **Enable Hand Control**: Toggle "hand controls granularity"
4. **Calibrate**: Place your hand at a comfortable distance and click "calibrate hand depth"
5. **Control**: Move your hand closer (higher granularity/more detail) or further (lower granularity/less detail)

The status indicator shows:
- **Green dot**: Hand detected
- **Blue dot**: Hand calibrated and ready
- **Depth bar**: Visual representation of hand position relative to calibration point
- **Real-time metrics**: Current depth offset and granularity values

<br/>

## Authors

This toolkit is curated and maintained by the darkroom.engineering team:

- Clement Roche ([@clementroche\_](https://twitter.com/clementroche_)) – [darkroom.engineering](https://darkroom.engineering)
- Guido Fier ([@uido15](https://twitter.com/uido15)) – [darkroom.engineering](https://darkroom.engineering)
- Leandro Soengas ([@lsoengas](https://twitter.com/lsoengas)) - [darkroom.engineering](https://darkroom.engineering)
- Franco Arza ([@arzafran](https://twitter.com/arzafran)) - [darkroom.engineering](https://darkroom.engineering)

<br/>

## License

[The MIT License.](https://opensource.org/licenses/MIT)
