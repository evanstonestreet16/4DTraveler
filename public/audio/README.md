# Temporary narration

`pittsburgh-1892-intro.wav` is a locally generated spoken placeholder reading `narration.txt`. No external voice API or runtime speech synthesis is used. It is intentionally temporary and not a historical source. The transcript is also exposed in the app through world metadata.

To regenerate on macOS using the installed system voice:

```sh
say -f public/audio/narration.txt -o /tmp/4d-traveler-narration.aiff
afconvert -f WAVE -d LEI16 /tmp/4d-traveler-narration.aiff public/audio/pittsburgh-1892-intro.wav
```

Replace the asset or update `scene.narrationAudio` in the world definition to change narration. Keep `scene.narrationTranscript` and this text synchronized.
