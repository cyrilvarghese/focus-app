# Design

Visual references and throwaway prototypes for the pottery studio. Nothing here ships with the app. Production assets belong in `public/` or `src/`.

```
design/
├── references/
│   └── chatgpt/      ChatGPT-generated mockups and moodboards (PNG, JPG, WebP, HTML)
└── prototypes/       Hand-built HTML prototypes you can open in a browser
    └── studio-scene.html   Isometric studio: four pals at one table, subtle CSS animation, tap a pal to doze
```

## Adding references

- Drop files into `references/chatgpt/`. Use short, descriptive names, such as `studio-front-view.png` or `pals-lineup.png`, not `ChatGPT Image Sep 18.png`.
- If the prompt that produced an image is worth keeping, save it next to the image as a `.txt` file with the same name.
- Keep each image under a few MB. Git keeps every version forever.

## Prototypes

Open any `.html` file in `prototypes/` directly in a browser. They have no build step and no dependencies.
