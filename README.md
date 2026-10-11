# Fatemeh Salehian — Interactive Portfolio

A responsive, single-page portfolio built from the references supplied in the Telegram conversation:

- bold black editorial layout and chapter-based storytelling;
- Fatemeh’s supplied nine-stage origami portrait sequence, scrubbed in real time;
- optional webcam hand tracking with MediaPipe Hands;
- hand-open/hand-closed control plus pointer scrubbing as a privacy-friendly fallback;
- sections for artistic statement, current explorations, working method, and contact.

## Open locally

Open `index.html` directly for the full pointer-driven experience. Move the pointer horizontally
across the right-hand portrait to scrub through all nine stages.

Camera access normally requires a secure context. For hand tracking, serve this folder on `localhost`, for example:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173` and choose “Enable hand tracking”. The MediaPipe model loads from jsDelivr, so that optional feature needs an internet connection.

## Privacy

Webcam frames are processed in the visitor’s browser. The site does not record or upload them.

## Content note

The portfolio uses only professional positioning that was visible in the supplied references. No
unverified employers, degrees, project credits, dates, email addresses, public contact details, or
client names were invented. Add those details when Fatemeh provides them.
