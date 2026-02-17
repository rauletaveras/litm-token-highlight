# Legend in the Mist Token Highlight

This is a simple [Obsidian](https://obsidian.md/) plugin to help use it to play the TTRPG [Legend in the Mist](https://sonofoak.com/pages/legend-in-the-mist) by Son of Oak.

## Usage

In editing mode, the plugin simply colours all blocks in square brackets that start with "T:" (for tag) in orange, and those that start with "S:" (for "status") in green.

Example:

```markdown
CONSEQUENCE: Scratch [T:Twigs] or gain [S:wounded-2].
```

Here, the strings `[T:Twigs]` and `[S:wounded-2]` will be coloured orange and green, respectively.

Additionally, in reading view, the plugin renders the `T:` as the label emoji 🏷️ and the `S:` as the fallen leaf emoji 🍂, as per some usage I saw in the Son of Oak discord. 

## Installation

Currently, you should be able to install it on PC, Mac, and Linux, by cloning the whole repo into your `.obsidian/plugins`. 
However, best practice is not to include artifacts, in which case, I think downloading `main.ts`, `manifest.json`, `package.json` and `tsconfig.json`, then running `npm install` and `npm run build` should do it.

You can also install this through [BRAT](https://github.com/TfTHacker/obsidian42-brat) by adding the url `https://github.com/rauletaveras/litm-token-highlight` and choosing "Latest version"
