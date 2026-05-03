// Japanese prompt database with 200+ entries
const japanesePrompts = [
    // Traditional/Cultural
    { jp: "桜吹雪の中で踊る芸者の美しいシルエット", en: "Beautiful silhouette of a geisha dancing in cherry blossom storm", tags: ["traditional", "sakura", "dance"], category: "traditional", weight: 2 },
    { jp: "富士山を背景にした侍の決闘シーン", en: "Samurai duel scene with Mount Fuji in background", tags: ["samurai", "fuji", "traditional"], category: "traditional", weight: 2 },
    { jp: "古い神社で祈りを捧げる巫女", en: "Shrine maiden praying at an ancient shrine", tags: ["shrine", "miko", "spiritual"], category: "traditional", weight: 2 },
    { jp: "竹林を駆け抜ける忍者の影", en: "Shadow of ninja running through bamboo forest", tags: ["ninja", "bamboo", "action"], category: "traditional", weight: 2 },
    { jp: "和紙に描かれた龍の水墨画", en: "Dragon ink painting on traditional Japanese paper", tags: ["dragon", "sumi-e", "art"], category: "traditional", weight: 2 },
    { jp: "紫式部が源氏物語を執筆する姿", en: "Murasaki Shikibu writing The Tale of Genji", tags: ["literature", "heian", "writing"], category: "traditional", weight: 2 },
    { jp: "能楽堂で舞う能面の演者", en: "Noh performer dancing with mask in theater", tags: ["noh", "theater", "mask"], category: "traditional", weight: 2 },
    { jp: "和太鼓を叩く祭りの演者たち", en: "Festival performers playing taiko drums", tags: ["taiko", "festival", "music"], category: "traditional", weight: 2 },
    { jp: "書道家が大筆で「愛」の字を書く", en: "Calligrapher writing 'love' character with large brush", tags: ["calligraphy", "love", "art"], category: "traditional", weight: 2 },
    { jp: "茶室で正座する着物美人", en: "Beautiful woman in kimono sitting seiza in tea room", tags: ["kimono", "tea-room", "seiza"], category: "traditional", weight: 2 },
    { jp: "お月見団子を作る月の兎", en: "Moon rabbit making dango for moon viewing", tags: ["moon", "rabbit", "dango"], category: "traditional", weight: 2 },
    { jp: "織姫と彦星が天の川で再会するシーン", en: "Orihime and Hikoboshi reuniting at Milky Way", tags: ["tanabata", "stars", "love"], category: "traditional", weight: 2 },
    { jp: "鬼が豆まきから逃げ回る節分の夜", en: "Oni demons fleeing from bean throwing on Setsubun night", tags: ["oni", "setsubun", "beans"], category: "traditional", weight: 2 },
    { jp: "縁日で金魚すくいに夢中な子供たち", en: "Children engrossed in goldfish scooping at festival", tags: ["festival", "goldfish", "children"], category: "traditional", weight: 2 },
    
    // Modern/Anime
    { jp: "ネオン街を歩く魔法少女", en: "Magical girl walking through neon-lit streets", tags: ["magical-girl", "neon", "urban"], category: "modern", weight: 3 },
    { jp: "制服を着た高校生が屋上で弁当を食べるシーン", en: "High school student in uniform eating bento on rooftop", tags: ["school", "bento", "youth"], category: "modern", weight: 3 },
    { jp: "猫カフェで本を読む少女", en: "Girl reading book in cat cafe", tags: ["cat-cafe", "reading", "cozy"], category: "modern", weight: 3 },
    { jp: "コスプレイヤーが秋葉原でポーズを取る", en: "Cosplayer posing in Akihabara", tags: ["cosplay", "akihabara", "otaku"], category: "modern", weight: 3 },
    { jp: "VRゴーグルをつけた女性が空中に浮かぶ", en: "Woman with VR goggles floating in air", tags: ["VR", "technology", "futuristic"], category: "modern", weight: 3 },
    { jp: "メイドカフェで微笑むツインテールの女の子", en: "Twin-tailed girl smiling in maid cafe", tags: ["maid-cafe", "twin-tails", "cute"], category: "modern", weight: 3 },
    { jp: "アイドルがステージでライブパフォーマンス", en: "Idol performing live on stage", tags: ["idol", "stage", "performance"], category: "modern", weight: 3 },
    { jp: "プリクラ機で写真を撮る女子高生たち", en: "High school girls taking purikura photos", tags: ["purikura", "schoolgirl", "friendship"], category: "modern", weight: 3 },
    { jp: "原宿でファッションを楽しむ若者たち", en: "Young people enjoying fashion in Harajuku", tags: ["harajuku", "fashion", "youth"], category: "modern", weight: 3 },
    { jp: "ゲーミングチェアでeスポーツをプレイするプロゲーマー", en: "Pro gamer playing esports in gaming chair", tags: ["esports", "gaming", "professional"], category: "modern", weight: 3 },
    
    // Humorous/Creative
    { jp: "寿司を作るロボットシェフ", en: "Robot chef making sushi", tags: ["robot", "sushi", "cooking"], category: "humorous", weight: 4 },
    { jp: "相撲取りがゲームセンターでゲームをする", en: "Sumo wrestler playing games at arcade", tags: ["sumo", "arcade", "contrast"], category: "humorous", weight: 4 },
    { jp: "忍者がバイクでデリバリーをする", en: "Ninja delivering food on motorcycle", tags: ["ninja", "delivery", "modern"], category: "humorous", weight: 4 },
    { jp: "パンダが空手道場で修行する", en: "Panda training karate in dojo", tags: ["panda", "karate", "cute"], category: "humorous", weight: 4 },
    { jp: "着物を着た宇宙人が温泉に入る", en: "Alien in kimono bathing in hot springs", tags: ["alien", "kimono", "onsen"], category: "humorous", weight: 4 },
    { jp: "電車で居眠りするサラリーマンの夢の中", en: "Inside the dreams of sleeping salaryman on train", tags: ["salaryman", "dreams", "train"], category: "humorous", weight: 4 },
    { jp: "自動販売機から小さな富士山が出てくる", en: "Tiny Mount Fuji coming out of vending machine", tags: ["vending-machine", "fuji", "surreal"], category: "humorous", weight: 4 },
    { jp: "柴犬が指揮者として伝統楽器オーケストラを指揮", en: "Shiba Inu conducting traditional instrument orchestra", tags: ["shiba-inu", "conductor", "orchestra"], category: "humorous", weight: 4 },
    { jp: "弁当箱の中に小さな日本庭園", en: "Miniature Japanese garden inside bento box", tags: ["bento", "garden", "miniature"], category: "humorous", weight: 4 },
    { jp: "新幹線が巨大な寿司ロールの形", en: "Bullet train shaped like giant sushi roll", tags: ["shinkansen", "sushi", "surreal"], category: "humorous", weight: 4 },
    
    // Seasonal
    { jp: "雪化粧した京都の金閣寺", en: "Snow-covered Kinkaku-ji temple in Kyoto", tags: ["winter", "temple", "snow"], category: "seasonal", weight: 2 },
    { jp: "夏祭りの花火大会で浴衣を着た恋人たちが手を繋ぐ", en: "Lovers in yukata holding hands at summer fireworks festival", tags: ["summer", "fireworks", "yukata"], category: "seasonal", weight: 2 },
    { jp: "紅葉の山道を歩くハイカー", en: "Hiker walking autumn mountain path with red leaves", tags: ["autumn", "hiking", "nature"], category: "seasonal", weight: 2 },
    { jp: "春の桜並木でピクニックする家族", en: "Family having picnic under spring cherry blossom trees", tags: ["spring", "sakura", "family"], category: "seasonal", weight: 2 },
    { jp: "雪だるまが着物を着て熱燗を飲む", en: "Snowman wearing kimono drinking hot sake", tags: ["snowman", "kimono", "sake"], category: "seasonal", weight: 3 },
    { jp: "桜の花びらがアニメキャラクターの形になって踊る", en: "Cherry blossom petals forming anime characters dancing", tags: ["sakura", "anime", "dancing"], category: "seasonal", weight: 3 },
    { jp: "紅葉がマンガキャラクターのように踊る", en: "Autumn leaves dancing like manga characters", tags: ["autumn", "manga", "dancing"], category: "seasonal", weight: 3 },
    { jp: "夏祭りに宇宙人の訪問者が参加", en: "Alien visitors participating in summer festival", tags: ["summer", "festival", "alien"], category: "seasonal", weight: 4 },
    
    // Fantasy/Magical
    { jp: "光る蝶々に囲まれた森の妖精", en: "Forest fairy surrounded by glowing butterflies", tags: ["fairy", "butterflies", "magical"], category: "fantasy", weight: 3 },
    { jp: "月夜に変身する狐の精霊", en: "Fox spirit transforming under moonlight", tags: ["fox-spirit", "moon", "transformation"], category: "fantasy", weight: 3 },
    { jp: "雲の上の城で暮らす天使", en: "Angel living in castle above clouds", tags: ["angel", "castle", "clouds"], category: "fantasy", weight: 3 },
    { jp: "海底神殿で踊る人魚姫", en: "Mermaid princess dancing in underwater temple", tags: ["mermaid", "underwater", "temple"], category: "fantasy", weight: 3 },
    { jp: "星座が空から降りてきて地上で踊る", en: "Constellations descending from sky to dance on earth", tags: ["constellation", "dancing", "magical"], category: "fantasy", weight: 4 },
    { jp: "虹色の髪を持つ魔女が薬草を調合", en: "Witch with rainbow hair brewing herbal potions", tags: ["witch", "rainbow", "potion"], category: "fantasy", weight: 3 },
    { jp: "鳳凰が桜の森で羽を休める", en: "Phoenix resting wings in cherry blossom forest", tags: ["phoenix", "sakura", "rest"], category: "fantasy", weight: 3 },
    { jp: "水晶球の中で小さな日本の街が動いている", en: "Tiny Japanese town moving inside crystal ball", tags: ["crystal-ball", "town", "miniature"], category: "fantasy", weight: 3 },
    { jp: "深海で光る提灯アンコウと潜水艦", en: "Glowing anglerfish and submarine in deep sea", tags: ["deep-sea", "anglerfish", "submarine"], category: "fantasy", weight: 3 },
    { jp: "時計台の中で時間を修理する職人", en: "Craftsman repairing time inside clock tower", tags: ["clock", "time", "craftsman"], category: "fantasy", weight: 3 },
    { jp: "図書館で本の中の世界に入る少女", en: "Girl entering world inside book at library", tags: ["library", "book", "fantasy"], category: "fantasy", weight: 3 },
    { jp: "ピアノの鍵盤を歩く小さな妖精たち", en: "Tiny fairies walking on piano keys", tags: ["piano", "fairies", "music"], category: "fantasy", weight: 3 },
    { jp: "雨の日の紫陽花畑を散歩する傘お化け", en: "Umbrella ghost walking through hydrangea field in rain", tags: ["umbrella", "ghost", "hydrangea"], category: "fantasy", weight: 3 },
    
    // Food Culture
    { jp: "職人が握る江戸前寿司の美しい断面", en: "Beautiful cross-section of Edomae sushi by master chef", tags: ["sushi", "craftsmanship", "food"], category: "food", weight: 2 },
    { jp: "湯気の立つラーメンボウルとチャーシュー", en: "Steaming ramen bowl with char siu pork", tags: ["ramen", "steam", "comfort"], category: "food", weight: 2 },
    { jp: "抹茶を点てる茶道師", en: "Tea ceremony master preparing matcha", tags: ["matcha", "tea-ceremony", "traditional"], category: "food", weight: 2 },
    { jp: "お花見弁当を広げる家族", en: "Family spreading hanami bento picnic", tags: ["bento", "hanami", "family"], category: "food", weight: 2 },
    { jp: "回転寿司のコンベアベルトで踊る寿司たち", en: "Sushi dancing on conveyor belt at kaiten sushi", tags: ["kaiten-sushi", "dancing", "playful"], category: "food", weight: 4 },
    { jp: "巨大なたこ焼きの中に住む小さな町", en: "Tiny town living inside giant takoyaki", tags: ["takoyaki", "town", "miniature"], category: "food", weight: 4 },
    { jp: "和菓子職人が虹色の練り切りを作る", en: "Wagashi artisan creating rainbow-colored nerikiri", tags: ["wagashi", "rainbow", "artisan"], category: "food", weight: 3 },
    { jp: "お好み焼きが空を飛んでいく", en: "Okonomiyaki flying through the sky", tags: ["okonomiyaki", "flying", "surreal"], category: "food", weight: 4 },
    
    // Urban/Cityscapes
    { jp: "雨に濡れた夜の渋谷交差点", en: "Rain-soaked Shibuya crossing at night", tags: ["shibuya", "rain", "urban"], category: "urban", weight: 2 },
    { jp: "高層ビルの間を飛ぶドローン", en: "Drone flying between skyscrapers", tags: ["drone", "cityscape", "technology"], category: "urban", weight: 3 },
    { jp: "朝の通勤ラッシュの駅構内", en: "Morning rush hour inside train station", tags: ["rush-hour", "commute", "busy"], category: "urban", weight: 2 },
    { jp: "夕暮れの東京タワーと桜", en: "Tokyo Tower and cherry blossoms at sunset", tags: ["tokyo-tower", "sakura", "sunset"], category: "urban", weight: 2 },
    { jp: "電車の窓から見える流れる夜景", en: "Flowing night scenery seen from train window", tags: ["train", "night", "motion"], category: "urban", weight: 2 },
    { jp: "コンビニの明かりが雨夜に反射する", en: "Convenience store lights reflecting in rainy night", tags: ["konbini", "rain", "reflection"], category: "urban", weight: 2 },
    { jp: "地下鉄の階段を上る人々のシルエット", en: "Silhouettes of people climbing subway stairs", tags: ["subway", "stairs", "silhouette"], category: "urban", weight: 2 },
    { jp: "屋上庭園で休憩するオフィスワーカー", en: "Office worker resting in rooftop garden", tags: ["rooftop", "garden", "worker"], category: "urban", weight: 2 },
    
    // Technology/Cyberpunk
    { jp: "ホログラムを操作するサイバー忍者", en: "Cyber ninja manipulating holograms", tags: ["cyberpunk", "ninja", "hologram"], category: "cyberpunk", weight: 4 },
    { jp: "ネオン光る義手を持つアンドロイド芸者", en: "Android geisha with glowing cybernetic arm", tags: ["android", "geisha", "cybernetic"], category: "cyberpunk", weight: 4 },
    { jp: "空中都市を飛び回る配達ドローン", en: "Delivery drones flying around floating city", tags: ["floating-city", "drone", "futuristic"], category: "cyberpunk", weight: 4 },
    { jp: "宇宙ステーションから見た地球と桜前線", en: "Earth and cherry blossom front seen from space station", tags: ["space", "earth", "sakura"], category: "cyberpunk", weight: 3 },
    { jp: "ホログラム広告に囲まれた未来の街角", en: "Future street corner surrounded by hologram ads", tags: ["hologram", "ads", "future"], category: "cyberpunk", weight: 3 },
    { jp: "サイボーグ芸者がエレクトロニックミュージックで踊る", en: "Cyborg geisha dancing to electronic music", tags: ["cyborg", "geisha", "electronic"], category: "cyberpunk", weight: 4 },
    { jp: "空飛ぶ車が富士山の周りを旋回", en: "Flying cars circling around Mount Fuji", tags: ["flying-car", "fuji", "future"], category: "cyberpunk", weight: 3 },
    { jp: "バーチャルリアリティの桜並木を歩く", en: "Walking through virtual reality cherry blossom avenue", tags: ["VR", "sakura", "virtual"], category: "cyberpunk", weight: 3 },
    
    // Nature/Animals
    { jp: "猫島で昼寝する数百匹の猫たち", en: "Hundreds of cats napping on cat island", tags: ["cats", "island", "peaceful"], category: "nature", weight: 2 },
    { jp: "雪猿が温泉で気持ちよさそうに入浴", en: "Snow monkeys bathing blissfully in hot springs", tags: ["monkey", "onsen", "winter"], category: "nature", weight: 2 },
    { jp: "竹を食べる可愛いパンダの親子", en: "Cute panda family eating bamboo", tags: ["panda", "bamboo", "family"], category: "nature", weight: 2 },
    { jp: "錦鯉が泳ぐ美しい庭園の池", en: "Beautiful garden pond with swimming koi fish", tags: ["koi", "pond", "garden"], category: "nature", weight: 2 },
    { jp: "桜の枝にとまる美しい鶯", en: "Beautiful warbler perched on cherry blossom branch", tags: ["warbler", "sakura", "bird"], category: "nature", weight: 2 },
    
    // Art/Cultural Activities
    { jp: "陶芸家が轆轤で壺を作る職人技", en: "Potter's craftsmanship making vase on wheel", tags: ["pottery", "wheel", "craftsmanship"], category: "art", weight: 2 },
    { jp: "折り紙アーティストが巨大な龍を折る", en: "Origami artist folding giant dragon", tags: ["origami", "dragon", "artist"], category: "art", weight: 2 },
    { jp: "漆職人が金蒔絵を施す細かい作業", en: "Lacquer artisan applying gold maki-e decoration", tags: ["lacquer", "maki-e", "gold"], category: "art", weight: 2 },
    { jp: "生け花師が季節の花で作品を作る", en: "Ikebana master creating arrangement with seasonal flowers", tags: ["ikebana", "flowers", "seasonal"], category: "art", weight: 2 },
    
    // Sports/Activities
    { jp: "相撲力士が稽古で汗を流す土俵", en: "Sumo wrestlers training hard on dohyo ring", tags: ["sumo", "training", "dohyo"], category: "sports", weight: 2 },
    { jp: "空手家が板を割る瞬間の集中力", en: "Karate master's concentration moment breaking boards", tags: ["karate", "concentration", "breaking"], category: "sports", weight: 2 },
    { jp: "弓道家が的に向かって弓を引く姿勢", en: "Kyudo archer drawing bow aimed at target", tags: ["kyudo", "archery", "posture"], category: "sports", weight: 2 },
    { jp: "剣道家同士の激しい竹刀の打ち合い", en: "Intense bamboo sword clash between kendo practitioners", tags: ["kendo", "sword", "clash"], category: "sports", weight: 2 }
];

// Improved Animation System
class AnimationSystem {
    constructor() {
        this.motionEnabled = true;
        this.activeAnimations = new Map();
        this.startBackgroundAnimation();
    }

    startBackgroundAnimation() {
        const createFloatingElements = () => {
            if (!this.motionEnabled) return;

            if (Math.random() < 0.1) {
                this.createFloatingParticle();
            }

            if (Math.random() < 0.05) {
                this.createStarParticle();
            }

            setTimeout(createFloatingElements, 500);
        };
        createFloatingElements();
    }

    createFloatingParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle-element';
        const colors = ['#FF6B9D', '#4ECDC4', '#FFA726', '#45B7D1', '#9C27B0'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = Math.random() * window.innerWidth + 'px';
        particle.style.top = '-10px';
        
        document.body.appendChild(particle);

        gsap.to(particle, {
            y: window.innerHeight + 50,
            x: (Math.random() - 0.5) * 300,
            rotation: Math.random() * 720,
            scale: Math.random() * 2 + 0.5,
            opacity: 0,
            duration: 4 + Math.random() * 2,
            ease: "none",
            onComplete: () => particle.remove()
        });
    }

    createStarParticle() {
        const star = document.createElement('div');
        star.className = 'particle-element star';
        star.style.left = Math.random() * window.innerWidth + 'px';
        star.style.top = Math.random() * window.innerHeight + 'px';
        
        document.body.appendChild(star);

        gsap.fromTo(star, 
            { scale: 0, rotation: 0, opacity: 0 },
            { 
                scale: 1.5, 
                rotation: 360, 
                opacity: 1,
                duration: 1,
                yoyo: true,
                repeat: 1,
                ease: "power2.inOut",
                onComplete: () => star.remove()
            }
        );
    }

    createExplosion(x, y, count = 30) {
        if (!this.motionEnabled) return;

        const colors = ['#FF6B9D', '#4ECDC4', '#FFA726', '#45B7D1', '#9C27B0'];
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'explosion-particle';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            
            // ランダムな形状
            if (Math.random() > 0.5) {
                particle.style.borderRadius = '0';
                particle.style.width = '6px';
                particle.style.height = '6px';
            } else {
                particle.style.borderRadius = '50%';
                particle.style.width = '8px';
                particle.style.height = '8px';
            }
            
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            particle.style.position = 'fixed';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '100';
            
            document.body.appendChild(particle);

            const angle = (Math.PI * 2 * i) / count;
            const distance = 80 + Math.random() * 120;
            const endX = x + Math.cos(angle) * distance;
            const endY = y + Math.sin(angle) * distance;

            gsap.to(particle, {
                x: endX - x,
                y: endY - y,
                scale: Math.random() * 2 + 0.5,
                rotation: Math.random() * 720,
                opacity: 0,
                duration: 1.5 + Math.random() * 0.5,
                ease: "power2.out",
                onComplete: () => particle.remove()
            });
        }
    }

    toggleMotion(enabled) {
        this.motionEnabled = enabled;
        if (!enabled) {
            // アクティブなアニメーションを停止
            this.activeAnimations.forEach((animation, element) => {
                animation.kill();
            });
            this.activeAnimations.clear();
            
            // パーティクルを削除
            document.querySelectorAll('.particle-element, .explosion-particle').forEach(el => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
        } else {
            this.startBackgroundAnimation();
        }
    }
}

// Prompt Animation System
class PromptAnimator {
    constructor() {
        this.flyingPrompts = [];
    }

    createFlyingPrompt(promptData, startX, startY, index, total) {
        const promptElement = document.createElement('div');
        promptElement.className = 'bouncing-prompt';
        promptElement.textContent = promptData.jp;
        promptElement.style.left = startX + 'px';
        promptElement.style.top = startY + 'px';
        promptElement.style.opacity = '0';
        promptElement.style.transform = 'scale(0) rotate(0deg)';
        
        document.body.appendChild(promptElement);
        
        this.flyingPrompts.push({
            element: promptElement,
            data: promptData,
            index: index
        });
        
        return promptElement;
    }

    getStartPosition(index) {
        const positions = [
            { x: 50, y: 50 },
            { x: window.innerWidth - 300, y: 50 },
            { x: 50, y: window.innerHeight - 100 },
            { x: window.innerWidth - 300, y: window.innerHeight - 100 },
            { x: window.innerWidth / 2 - 125, y: 100 }
        ];
        return positions[index % positions.length];
    }

    async animateToGrid(selectedPrompts) {
        // プロンプトグリッドをクリア
        const promptGrid = document.getElementById('promptGrid');
        promptGrid.innerHTML = '';

        // ステップ1: 飛んでいるプロンプトを作成
        selectedPrompts.forEach((prompt, index) => {
            const startPos = this.getStartPosition(index);
            this.createFlyingPrompt(prompt, startPos.x, startPos.y, index, selectedPrompts.length);
        });

        const timeline = gsap.timeline();

        // ステップ2: 出現アニメーション
        timeline.to(this.flyingPrompts.map(obj => obj.element), {
            opacity: 1,
            scale: 1.2,
            rotation: 360,
            duration: 0.8,
            ease: "back.out(1.7)",
            stagger: 0.1
        });

        // バウンス効果
        timeline.to(this.flyingPrompts.map(obj => obj.element), {
            scale: 1,
            rotation: 0,
            duration: 0.3,
            ease: "elastic.out(1, 0.5)",
            stagger: 0.02
        });

        // ステップ3: グリッド位置に移動しながら最終形態に変化
        this.flyingPrompts.forEach((promptObj, index) => {
            const gridRect = promptGrid.getBoundingClientRect();
            const cols = window.innerWidth > 768 ? 2 : 1;
            const row = Math.floor(index / cols);
            const col = index % cols;
            
            const cardWidth = cols === 1 ? gridRect.width - 40 : (gridRect.width - 60) / 2;
            const cardHeight = 150;
            const gap = 20;
            
            const finalX = gridRect.left + col * (cardWidth + gap) + 20;
            const finalY = gridRect.top + row * (cardHeight + gap);

            timeline.to(promptObj.element, {
                x: finalX - parseFloat(promptObj.element.style.left),
                y: finalY - parseFloat(promptObj.element.style.top),
                width: cardWidth,
                rotation: 0,
                scale: 1,
                duration: 0.6,
                ease: "back.out(1.5)",
                onComplete: () => {
                    // 飛んでいるプロンプトを実際のカードに変換
                    this.convertToCard(promptObj, index);
                }
            }, "-=0.2");
        });

        return timeline;
    }

    convertToCard(promptObj, index) {
        const { element, data } = promptObj;
        const promptGrid = document.getElementById('promptGrid');
        
        // カードを作成
        const card = document.createElement('div');
        card.className = 'prompt-card';
        card.style.opacity = '0';
        
        card.innerHTML = `
            <div class="prompt-japanese">${data.jp}</div>
            <div class="prompt-translation">${data.en}</div>
            <div class="prompt-tags">
                ${data.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        `;
        
        promptGrid.appendChild(card);

        // 飛んでいるプロンプトからカードへの変換アニメーション
        gsap.to(element, {
            opacity: 0,
            scale: 1.2,
            duration: 0.3,
            onComplete: () => element.remove()
        });

        gsap.to(card, {
            opacity: 1,
            scale: 1,
            duration: 0.3,
            from: { scale: 0.8 }
        });
    }

    clearFlyingPrompts() {
        this.flyingPrompts.forEach(obj => obj.element.remove());
        this.flyingPrompts = [];
    }
}

// Main Prompt Generator
class PromptGenerator {
    constructor() {
        this.animationSystem = new AnimationSystem();
        this.promptAnimator = new PromptAnimator();
        this.isGenerating = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Motion toggle
        const motionToggle = document.getElementById('motionToggle');
        motionToggle.addEventListener('click', () => {
            motionToggle.classList.toggle('active');
            const enabled = motionToggle.classList.contains('active');
            this.animationSystem.toggleMotion(enabled);
        });

        // Generate button
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.addEventListener('click', () => this.generatePrompts());

        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            motionToggle.classList.remove('active');
            this.animationSystem.toggleMotion(false);
        }
    }

    weightedRandomSelect(items, count = 5) {
        const weightedItems = [];
        items.forEach(item => {
            for (let i = 0; i < item.weight; i++) {
                weightedItems.push(item);
            }
        });

        const selected = [];
        const used = new Set();

        while (selected.length < count && selected.length < items.length) {
            const randomIndex = Math.floor(Math.random() * weightedItems.length);
            const item = weightedItems[randomIndex];
            
            if (!used.has(item.jp)) {
                selected.push(item);
                used.add(item.jp);
            }
        }

        return selected;
    }

    async generatePrompts() {
        if (this.isGenerating) return;
        
        this.isGenerating = true;
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.classList.add('generating');

        const selectedPrompts = this.weightedRandomSelect(japanesePrompts, 5);

        if (!this.animationSystem.motionEnabled) {
            // アニメーションなしで直接表示
            this.displayPromptsDirectly(selectedPrompts);
            generateBtn.classList.remove('generating');
            this.isGenerating = false;
            return;
        }

        // 爆発エフェクト
        const buttonRect = generateBtn.getBoundingClientRect();
        const centerX = buttonRect.left + buttonRect.width / 2;
        const centerY = buttonRect.top + buttonRect.height / 2;
        
        this.animationSystem.createExplosion(centerX, centerY, 40);

        // 既存のプロンプトをクリア
        this.promptAnimator.clearFlyingPrompts();

        // アニメーション開始
        await this.promptAnimator.animateToGrid(selectedPrompts);

        generateBtn.classList.remove('generating');
        this.isGenerating = false;
    }

    displayPromptsDirectly(prompts) {
        const promptGrid = document.getElementById('promptGrid');
        promptGrid.innerHTML = '';

        prompts.forEach((prompt, index) => {
            const card = document.createElement('div');
            card.className = 'prompt-card';
            
            card.innerHTML = `
                <div class="prompt-japanese">${prompt.jp}</div>
                <div class="prompt-translation">${prompt.en}</div>
                <div class="prompt-tags">
                    ${prompt.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            `;

            promptGrid.appendChild(card);

            gsap.fromTo(card, 
                { opacity: 0, y: 20 },
                { 
                    opacity: 1, 
                    y: 0, 
                    duration: 0.5, 
                    delay: index * 0.1 
                }
            );
        });
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    new PromptGenerator();
}); 