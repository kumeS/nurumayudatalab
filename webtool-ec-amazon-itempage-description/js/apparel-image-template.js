/**
 * アパレル画像生成プロンプトテンプレート
 * 
 * 目的: アパレル商品の画像生成AI用プロンプトを自動作成
 * 出力: 10〜20個の英語プロンプト（商品の様々な角度、ディテール、モデル着用シーン、使用シーン）
 */

const apparelImageTemplate = `You are a professional product photographer and prompt engineer specializing in e-commerce apparel photography. Based on the following product information, create 10-20 detailed image generation prompts in English for AI image generation tools (Midjourney, DALL-E, Stable Diffusion).

## Product Information

**Product Name**: {{product_name}}

**Product Description**: {{product_description}}

**Target Gender**: {{gender}}

**Target Age Group**: {{age}}

**Fashion Style**: {{style}}

---

## Prompt Requirements

Create prompts for the following categories:

### 1. Product from Various Angles (3-4 prompts)
- Front view
- Back view
- Side view
- 45-degree angle view

Each prompt should describe:
- The product in detail
- Professional studio lighting
- White or neutral background
- High resolution, commercial quality

### 2. Product Details and Close-ups (3-4 prompts)
- Fabric texture and weave close-up
- Details of buttons, zippers, pockets
- Brand logo or tag
- Stitching and seam details

Each prompt should emphasize:
- Macro photography style
- Sharp focus on textures
- Professional product photography lighting

### 3. AI Model Wearing the Product (5-8 prompts)
- Full body shot (front, side, back)
- Upper body shot
- Dynamic poses (walking, sitting, moving)
- Lifestyle shots in context

Model characteristics should match:
- Target gender: {{gender}}
- Target age group: {{age}}
- Fashion style: {{style}}

Each prompt should include:
- Model description matching target demographics
- Natural poses and expressions
- Professional fashion photography style
- Appropriate background and setting

### 4. Usage Scenes and Styling (3-4 prompts)
- Lifestyle scenes appropriate for the fashion style
- Context showing how the product is used
- Atmosphere matching target demographics
- Complementary styling and accessories

---

## Output Format

Please output in the following format:

### Category 1: Product from Various Angles

**Prompt 1 (Front View)**:
[50-150 words detailed English prompt]

**Prompt 2 (Back View)**:
[50-150 words detailed English prompt]

**Prompt 3 (Side View)**:
[50-150 words detailed English prompt]

**Prompt 4 (45-degree Angle)**:
[50-150 words detailed English prompt]

---

### Category 2: Product Details and Close-ups

**Prompt 5 (Fabric Texture)**:
[50-150 words detailed English prompt]

**Prompt 6 (Detail Elements)**:
[50-150 words detailed English prompt]

**Prompt 7 (Brand Tag/Logo)**:
[50-150 words detailed English prompt]

**Prompt 8 (Stitching Details)**:
[50-150 words detailed English prompt]

---

### Category 3: AI Model Wearing the Product

**Prompt 9 (Full Body - Front)**:
[50-150 words detailed English prompt including model description]

**Prompt 10 (Full Body - Side)**:
[50-150 words detailed English prompt including model description]

**Prompt 11 (Full Body - Back)**:
[50-150 words detailed English prompt including model description]

**Prompt 12 (Upper Body Shot)**:
[50-150 words detailed English prompt including model description]

**Prompt 13 (Dynamic Pose 1)**:
[50-150 words detailed English prompt including model description]

**Prompt 14 (Dynamic Pose 2)**:
[50-150 words detailed English prompt including model description]

**Prompt 15 (Lifestyle Shot 1)**:
[50-150 words detailed English prompt including model description]

**Prompt 16 (Lifestyle Shot 2)**:
[50-150 words detailed English prompt including model description]

---

### Category 4: Usage Scenes and Styling

**Prompt 17 (Usage Scene 1)**:
[50-150 words detailed English prompt]

**Prompt 18 (Usage Scene 2)**:
[50-150 words detailed English prompt]

**Prompt 19 (Styling Shot 1)**:
[50-150 words detailed English prompt]

**Prompt 20 (Styling Shot 2)**:
[50-150 words detailed English prompt]

---

## Important Notes

- All prompts must be in **English**
- Each prompt should be **50-150 words**
- Describe lighting, composition, and technical details
- Use professional photography terminology
- Ensure commercial-quality, e-commerce-ready results
- Match the style and target demographics consistently
- Be specific about materials, colors, and textures mentioned in the product description`;
