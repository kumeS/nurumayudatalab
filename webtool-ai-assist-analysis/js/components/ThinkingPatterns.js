/**
 * Thinking Patterns Component
 * Defines and manages different AI thinking approaches
 */

class ThinkingPatterns {
    constructor() {
        this.patterns = this.initializePatterns();
        this.presets = this.initializePresets();
    }

    /**
     * Initialize all thinking patterns
     * @returns {Object} Object containing all thinking patterns
     */
    initializePatterns() {
        return {
            // Basic thinking approaches
            horizontal: {
                id: 'horizontal',
                name: '水平思考',
                category: 'basic',
                prompt: '水平思考で考えて、答えを導いて。',
                description: '既存の枠組みにとらわれない創造的アプローチ',
                defaultSelected: true
            },
            
            fermi: {
                id: 'fermi',
                name: 'フェルミ推定',
                category: 'basic',
                prompt: 'フェルミ推定をして、答えを導いて。',
                description: '限られた情報から論理的に概算値を導出',
                defaultSelected: false
            },
            
            chainOfThought: {
                id: 'chainOfThought',
                name: '思考連鎖',
                category: 'basic',
                prompt: 'ステップバイステップで思考過程を説明しながら、解決策を導いて（市場確認、時期特定、変更点洗い出し、真の原因発見、段階的深掘り）',
                description: '段階的な論理展開による問題解決',
                defaultSelected: true
            },
            
            opposite: {
                id: 'opposite',
                name: '反対視点',
                category: 'basic',
                prompt: 'この企画を却下する上司の視点で穴を探して。',
                description: '批判的思考によるリスク分析',
                defaultSelected: false
            },
            
            fiveWhy: {
                id: 'fiveWhy',
                name: '5Why分析',
                category: 'basic',
                prompt: '5回なぜを繰り返して、最終的な根本原因を探究して。',
                description: '根本原因の究明手法',
                defaultSelected: false
            },
            
            assumptionCheck: {
                id: 'assumptionCheck',
                name: '前提見直し',
                category: 'basic',
                prompt: '前提を疑って。常識だと思っていたことで実は思い込みだったことをあぶり出して。',
                description: '既成概念の再検討',
                defaultSelected: false
            },

            vertical: {
                id: 'vertical',
                name: '垂直思考',
                category: 'basic',
                prompt: '垂直思考で論理的・段階的に深掘りして問題を分析し、明確な解答に導いて。',
                description: '論理的・段階的な深掘り分析',
                defaultSelected: false
            },

            critical: {
                id: 'critical',
                name: 'クリティカルシンキング',
                category: 'basic',
                prompt: 'クリティカルシンキングで前提や仮定を疑い、論理の整合性や証拠に基づいて物事を評価して。',
                description: '論理性と証拠に基づく評価',
                defaultSelected: true
            },

            creative: {
                id: 'creative',
                name: '創造的思考',
                category: 'basic',
                prompt: '創造的思考で独創的なアイディアや新しい概念を生み出すために、自由な発想を展開して。',
                description: '独創性と新しいアイディア創出',
                defaultSelected: false
            },

            analytical: {
                id: 'analytical',
                name: '分析的思考',
                category: 'basic',
                prompt: '分析的思考で複雑な問題を細かく分解し、それぞれの要素を体系的に検証して。',
                description: '体系的な要素分解と検証',
                defaultSelected: true
            },

            intuitive: {
                id: 'intuitive',
                name: '直観的思考',
                category: 'basic',
                prompt: '直観的思考で論理よりも経験や感覚に基づき、瞬時の判断やアイディアを生み出して。',
                description: '経験と感覚による瞬時判断',
                defaultSelected: false
            },

            divergent: {
                id: 'divergent',
                name: '発散的思考',
                category: 'basic',
                prompt: '発散的思考であるテーマに対して多数のアイディアを広範に生み出し、可能性を探って。',
                description: '多数のアイディアと可能性探求',
                defaultSelected: false
            },

            convergent: {
                id: 'convergent',
                name: '収束的思考',
                category: 'basic',
                prompt: '収束的思考で多様なアイディアの中から最適な解決策を絞り込み、統合して。',
                description: 'アイディアの絞り込みと統合',
                defaultSelected: false
            },

            logical: {
                id: 'logical',
                name: '論理的思考',
                category: 'basic',
                prompt: '論理的思考で明確な前提と論理的推論に基づき、結論に至る合理的な考え方を展開して。',
                description: '論理的推論による合理的結論',
                defaultSelected: true
            },

            reverse: {
                id: 'reverse',
                name: '逆転思考',
                category: 'basic',
                prompt: '逆転思考で常識や既成概念を意図的に逆転させることで、新たな視点や解決策を見つけ出して。',
                description: '常識の逆転による新視点',
                defaultSelected: false
            },

            sensemaking: {
                id: 'sensemaking',
                name: 'センスメイキング',
                category: 'basic',
                prompt: 'センスメイキング思考で混乱の中でパターンを見つけ、情報を文脈に落とし込み意味のあるストーリーを構築して。',
                description: '情報から意味とパターンの構築',
                defaultSelected: true
            },

            abductive: {
                id: 'abductive',
                name: 'アブダクション',
                category: 'basic',
                prompt: 'アブダクション推論で観察された事実に対して最もありそうな仮説を複数挙げ、それぞれがどのように事実を説明できるかを示して。',
                description: '最適仮説の推測と検証',
                defaultSelected: false
            },

            secondOrder: {
                id: 'secondOrder',
                name: 'セカンドオーダー思考',
                category: 'basic',
                prompt: 'セカンドオーダー思考で「その次に何が起こる？」を二段階以上で考え、直接効果ではなく派生・副次のインパクトを読み取って。',
                description: '二次・三次効果を予測する深層思考',
                defaultSelected: false
            },
            
            // Professional domain thinking
            sales: {
                id: 'sales',
                name: '営業思考',
                category: 'professional',
                prompt: 'トップ営業マン的思考で、顧客課題、予算、導入メリット3つ、ROI計算、競合との差別化を分析して。',
                description: '営業・提案の観点での分析',
                defaultSelected: false
            },
            
            accounting: {
                id: 'accounting',
                name: '経理思考',
                category: 'professional',
                prompt: '経理的思考で、前月比・前年同期比、異常値の原因推測、改善提案3つ、役員向けサマリーを作成して。',
                description: '財務・数値分析の観点',
                defaultSelected: false
            },
            
            recruitment: {
                id: 'recruitment',
                name: '採用思考',
                category: 'professional',
                prompt: '採用プロ目線で、ターゲットに刺さる文言改善、応募率を上げるキーワード選定、評価基準を提示して。',
                description: '人事・採用の専門的観点',
                defaultSelected: false
            },
            
            strategic: {
                id: 'strategic',
                name: '戦略思考',
                category: 'professional',
                prompt: '戦略思考で、アイデア10個（実現可能性付き）、必要リソースと期間、想定課題と対策、成功指標（KPI）を提示して。',
                description: '経営戦略の観点での分析',
                defaultSelected: true
            },
            
            snsMarketing: {
                id: 'snsMarketing',
                name: 'SNSマーケティング思考',
                category: 'professional',
                prompt: 'SNSマーケティング視点で、バズる投稿文5パターン、ハッシュタグ20個、投稿時間の提案をして。',
                description: 'デジタルマーケティングの観点',
                defaultSelected: false
            },

            design: {
                id: 'design',
                name: 'デザイン思考',
                category: 'professional',
                prompt: 'デザイン思考でユーザー視点を重視し、共感・発想・プロトタイピングを繰り返すことで問題解決を図って。',
                description: 'ユーザー中心の問題解決手法',
                defaultSelected: true
            },

            // Advanced thinking approaches
            systems: {
                id: 'systems',
                name: 'システム思考',
                category: 'advanced',
                prompt: 'システム思考で個々の要素だけでなく、それらの相互関係や全体像を把握し、複雑なシステムを理解・改善して。',
                description: '全体性と相互関係の理解',
                defaultSelected: false
            },

            futures: {
                id: 'futures',
                name: 'フューチャーシンキング',
                category: 'advanced',
                prompt: 'フューチャーシンキングで現在の動向から未来のシナリオを予測し、長期的な視点で戦略を考えて。',
                description: '未来予測と長期戦略立案',
                defaultSelected: false
            },

            structured: {
                id: 'structured',
                name: '構造化思考',
                category: 'advanced',
                prompt: '構造化思考で複雑な情報を体系やフレームワークに沿って整理し、明確なステップで理解して。',
                description: '体系的情報整理と理解',
                defaultSelected: true
            },

            visual: {
                id: 'visual',
                name: '視覚思考',
                category: 'advanced',
                prompt: '視覚思考で図やグラフ、マインドマップなどのビジュアルツールを用いて情報を整理・分析して。',
                description: 'ビジュアルツールによる情報処理',
                defaultSelected: false
            },

            metacognitive: {
                id: 'metacognitive',
                name: 'メタ認知',
                category: 'advanced',
                prompt: 'メタ認知で自分自身の思考プロセスを振り返り、効果的な学習や判断の改善につなげて。',
                description: '思考プロセスの自己認識と改善',
                defaultSelected: false
            },

            problemSolving: {
                id: 'problemSolving',
                name: '問題解決思考',
                category: 'professional',
                prompt: '問題解決思考で問題の原因分析から解決策の検討・実施まで、一連のプロセスを体系的に進めて。',
                description: '体系的問題解決プロセス',
                defaultSelected: true
            },

            analogical: {
                id: 'analogical',
                name: 'アナロジー思考',
                category: 'advanced',
                prompt: 'アナロジー思考で他の分野や類似した状況からの知見を応用し、新たな解決策を模索して。',
                description: '類推による知見の応用',
                defaultSelected: false
            },

            statistical: {
                id: 'statistical',
                name: '統計的思考',
                category: 'professional',
                prompt: '統計的思考でデータや統計に基づいて現象を解析し、客観的な判断を下して。',
                description: 'データに基づく客観的分析',
                defaultSelected: false
            },

            hypothetical: {
                id: 'hypothetical',
                name: '仮説検証思考',
                category: 'advanced',
                prompt: '仮説検証思考で仮説を設定し、その検証を通じて理論や解決策を導出して。',
                description: '科学的な仮説検証アプローチ',
                defaultSelected: false
            },

            integrative: {
                id: 'integrative',
                name: '融合理論思考',
                category: 'advanced',
                prompt: '融合理論思考で異なる視点や情報を統合して、相反する要素を調和させた新しい解決策を見出して。',
                description: '異なる要素の統合と調和',
                defaultSelected: false
            },

            mindMapping: {
                id: 'mindMapping',
                name: 'マインドマッピング',
                category: 'advanced',
                prompt: 'マインドマッピングでアイディアや情報の関係性を視覚的に展開し、全体像や連想を整理して。',
                description: 'アイディアの視覚的関係性整理',
                defaultSelected: false
            },

            experimental: {
                id: 'experimental',
                name: '実験的思考',
                category: 'advanced',
                prompt: '実験的思考で試行錯誤を通じてアイディアを検証し、フィードバックを反映して改善を図って。',
                description: '試行錯誤による検証と改善',
                defaultSelected: false
            },

            reflective: {
                id: 'reflective',
                name: '自己反省思考',
                category: 'expert',
                prompt: '自己反省思考で自分の経験や行動を振り返り、学びや改善点を抽出して。',
                description: '経験の振り返りと学習',
                defaultSelected: false
            },

            consensus: {
                id: 'consensus',
                name: '合意形成思考',
                category: 'expert',
                prompt: '合意形成思考で複数の意見を調整し、グループ全体で合意に達するための協働的なアプローチを展開して。',
                description: '多様な意見の調整と合意形成',
                defaultSelected: false
            },

            multidimensional: {
                id: 'multidimensional',
                name: '多角的思考',
                category: 'expert',
                prompt: '多角的思考で一つの問題を複数の側面から検討し、バランスの取れた解決策を導いて。',
                description: '複数視点からのバランス検討',
                defaultSelected: true
            },

            collaborative: {
                id: 'collaborative',
                name: 'コラボラティブ思考',
                category: 'expert',
                prompt: 'コラボラティブ思考でチームやコミュニティ内で意見交換を行い、集団の知恵を結集して問題に対処して。',
                description: '集団知恵の結集と協働',
                defaultSelected: false
            },

            emotional: {
                id: 'emotional',
                name: 'エモーショナル思考',
                category: 'expert',
                prompt: 'エモーショナル思考で感情や直感を取り入れて、情緒面からの洞察を重視する意思決定を行って。',
                description: '感情と直感を重視した意思決定',
                defaultSelected: false
            },

            effectuation: {
                id: 'effectuation',
                name: 'エフェクチュエーション',
                category: 'expert',
                prompt: 'エフェクチュエーション思考で与えられた手持ちの資源で何ができるかを考え、未来は予測ではなく創り出すものとして設計して。',
                description: '手持ち資源での未来創造',
                defaultSelected: false
            },

            fieldTheory: {
                id: 'fieldTheory',
                name: '場の理論',
                category: 'expert',
                prompt: '場の理論で人の行動は個人と環境（場）の関数として捉え、環境の変化が人をどう変えるかを想像して分析して。',
                description: '個人と環境の相互作用分析',
                defaultSelected: false
            },

            memeTheory: {
                id: 'memeTheory',
                name: 'ミーム理論',
                category: 'expert',
                prompt: 'ミーム理論で文化や考え方が遺伝子のように自己複製し伝播するメカニズムを分析し、何が模倣されやすいかを読み取って。',
                description: '文化・思考の伝播メカニズム分析',
                defaultSelected: false
            },

            emergence: {
                id: 'emergence',
                name: '複雑系・エマージェンス',
                category: 'expert',
                prompt: '複雑系思考でシンプルなルールから予測不可能なパターンが出現する仕組みを分析し、全体は部分の足し算以上の振る舞いを予測して。',
                description: '創発現象と複雑系の理解',
                defaultSelected: false
            },

            narrative: {
                id: 'narrative',
                name: 'ナラティブ戦略',
                category: 'expert',
                prompt: 'ナラティブ戦略思考で人がストーリーで未来を理解する特性を活用し、データではなく意味やストーリーから方向性を読んで。',
                description: 'ストーリーによる意味構築と理解',
                defaultSelected: false
            },

            paradigmShift: {
                id: 'paradigmShift',
                name: 'パラダイムシフト',
                category: 'expert',
                prompt: 'パラダイムシフト思考で現在のルールが未来でも通用するかを疑い、枠組み自体が変わる可能性と新しい価値観・制度を想像して。',
                description: '根本的枠組み変化の予測',
                defaultSelected: false
            },

            layeredThinking: {
                id: 'layeredThinking',
                name: 'レイヤー思考',
                category: 'expert',
                prompt: 'レイヤー思考で変化を層（流行・技術・制度・文化）に分類し、それぞれの変化速度と影響範囲を意識して分析して。',
                description: '変化の層別分析と速度認識',
                defaultSelected: false
            },

            turningPoint: {
                id: 'turningPoint',
                name: 'ターニングポイント思考',
                category: 'expert',
                prompt: 'ターニングポイント思考で数値ではなく「どこが折り返し点になるか？」を重視し、小さな兆しの意味を考え抜いて。',
                description: '変化の転換点と兆し読み',
                defaultSelected: false
            },

            scenarioPlanning: {
                id: 'scenarioPlanning',
                name: 'シナリオ・プランニング',
                category: 'expert',
                prompt: 'シナリオ・プランニングで単一予測ではなく複数の「あり得る未来物語」を並行設計し、不確実性を抱き込んだ戦略を検討して。',
                description: '複数未来シナリオの並行設計',
                defaultSelected: false
            },

            backcasting: {
                id: 'backcasting',
                name: 'バックキャスティング',
                category: 'expert',
                prompt: 'バックキャスティング思考で望ましい未来像から逆算して現在の行動を決定し、可能性より意図を先に置いた行動指針を作成して。',
                description: '理想未来からの逆算思考',
                defaultSelected: false
            },

            threeHorizons: {
                id: 'threeHorizons',
                name: '３つの地平線モデル',
                category: 'expert',
                prompt: '３つの地平線モデルで現在の主流・成長芽・変革的アイデアを時間軸で併存管理し、既存価値の最適化と破壊的イノベーションの共存点を発見して。',
                description: '時間軸での価値創造管理',
                defaultSelected: false
            },

            weakSignals: {
                id: 'weakSignals',
                name: '弱いシグナル',
                category: 'expert',
                prompt: '弱いシグナル思考で微小な兆候から波及効果を同心円状に展開し、些細な変化が拡大する筋道を可視化して早期介入タイミングを掴んで。',
                description: '微弱兆候からの影響予測',
                defaultSelected: false
            },

            morphological: {
                id: 'morphological',
                name: '形態学分析',
                category: 'expert',
                prompt: '形態学分析で問題を主要パラメータ×選択肢のマトリクスに展開し、組合せ空間を網羅的に探索して未知の組合せが生む可能性を洗い出して。',
                description: 'パラメータ組合せ空間の網羅探索',
                defaultSelected: false
            },

            cynefin: {
                id: 'cynefin',
                name: 'サイネフィン',
                category: 'expert',
                prompt: 'サイネフィン・フレームワークで問題領域を単純・複雑・複雑系・カオスで分類し、状況ごとに取るべき意思決定スタイルを切り替えて。',
                description: '状況別意思決定スタイル選択',
                defaultSelected: false
            },

            ooda: {
                id: 'ooda',
                name: 'OODAループ',
                category: 'expert',
                prompt: 'OODAループ思考でObserve→Orient→Decide→Actの高速循環により、変化が激しい領域で仮説→検証→適応をリアルタイム更新して。',
                description: '高速循環による適応的意思決定',
                defaultSelected: false
            },

            antifragile: {
                id: 'antifragile',
                name: 'アンチフラジャイル',
                category: 'expert',
                prompt: 'アンチフラジャイル思考で不確実性やショックで強くなるシステム設計を考え、平均的未来ではなく極端が起きる世界での回復力を鍛えて。',
                description: 'ショック耐性とレジリエンス設計',
                defaultSelected: false
            }
        };
    }

    /**
     * Get all patterns
     * @returns {Object} All thinking patterns
     */
    getAllPatterns() {
        return this.patterns;
    }

    /**
     * Get patterns by category
     * @param {string} category - Pattern category ('basic' or 'expert')
     * @returns {Object} Patterns in the specified category
     */
    getPatternsByCategory(category) {
        const filtered = {};
        Object.keys(this.patterns).forEach(key => {
            if (this.patterns[key].category === category) {
                filtered[key] = this.patterns[key];
            }
        });
        return filtered;
    }

    /**
     * Get basic thinking patterns
     * @returns {Object} Basic thinking patterns
     */
    getBasicPatterns() {
        return this.getPatternsByCategory('basic');
    }

    /**
     * Get expert thinking patterns (including professional and advanced patterns)
     * @returns {Object} Expert thinking patterns
     */
    getExpertPatterns() {
        const filtered = {};
        Object.keys(this.patterns).forEach(key => {
            if (['expert', 'professional', 'advanced'].includes(this.patterns[key].category)) {
                filtered[key] = this.patterns[key];
            }
        });
        return filtered;
    }

    /**
     * Get a specific pattern by ID
     * @param {string} id - Pattern ID
     * @returns {Object|null} Pattern object or null if not found
     */
    getPattern(id) {
        return this.patterns[id] || null;
    }

    /**
     * Initialize preset pattern combinations
     * @returns {Object} Preset definitions
     */
    initializePresets() {
        return {
            recommended: {
                name: '推奨パターン',
                description: 'バランスの取れた分析に最適',
                patterns: ['horizontal', 'chainOfThought', 'strategic', 'sensemaking']
            },
            comprehensive: {
                name: '包括的分析',
                description: '全方位的な深い分析',
                patterns: ['horizontal', 'chainOfThought', 'critical', 'strategic', 'systems', 'multidimensional']
            },
            creative: {
                name: '創造的思考',
                description: '斬新なアイデア創出',
                patterns: ['horizontal', 'creative', 'assumptionCheck', 'reverse', 'effectuation']
            },
            logical: {
                name: '論理的分析',
                description: '体系的な問題解決',
                patterns: ['logical', 'analytical', 'chainOfThought', 'structured']
            },
            critical: {
                name: '批判的検討',
                description: 'リスクと課題の特定',
                patterns: ['critical', 'opposite', 'assumptionCheck', 'secondOrder', 'antifragile']
            },
            strategic: {
                name: '戦略的思考',
                description: 'ビジネス戦略立案',
                patterns: ['strategic', 'scenarioPlanning', 'backcasting', 'threeHorizons']
            },
            practical: {
                name: '実践的解決',
                description: '即実行可能な提案',
                patterns: ['problemSolving', 'effectuation', 'ooda', 'design']
            },
            business: {
                name: 'ビジネス思考',
                description: 'ビジネス全般の分析',
                patterns: ['sales', 'accounting', 'strategic', 'recruitment']
            },
            futuristic: {
                name: '未来予測',
                description: '先見的な洞察と予測',
                patterns: ['futures', 'scenarioPlanning', 'weakSignals', 'paradigmShift', 'turningPoint']
            },
            systems: {
                name: 'システム思考',
                description: '複雑なシステムの理解',
                patterns: ['systems', 'emergence', 'fieldTheory', 'layeredThinking', 'cynefin']
            },
            innovation: {
                name: 'イノベーション',
                description: '革新的なソリューション',
                patterns: ['design', 'effectuation', 'morphological', 'experimental', 'abductive']
            },
            cultural: {
                name: '文化・社会分析',
                description: '社会現象と文化の理解',
                patterns: ['memeTheory', 'narrative', 'sensemaking', 'collaborative', 'consensus']
            }
        };
    }

    /**
     * Get preset by ID
     * @param {string} presetId - Preset ID
     * @returns {Object|null} Preset object or null
     */
    getPreset(presetId) {
        return this.presets[presetId] || null;
    }

    /**
     * Get all presets
     * @returns {Object} All presets
     */
    getAllPresets() {
        return this.presets;
    }

    /**
     * Alias for backwards compatibility
     * @returns {Object} All presets
     */
    getPresets() {
        return this.getAllPresets();
    }

    /**
     * Validate preset definitions and provide diagnostics
     * @returns {Object} Validation report
     */
    validatePresets() {
        const patternIds = Object.keys(this.patterns);
        const presets = this.getAllPresets();
        const usedCounts = patternIds.reduce((acc, id) => {
            acc[id] = 0;
            return acc;
        }, {});

        const categoryOrder = {
            basic: 0,
            professional: 1,
            advanced: 2,
            expert: 3,
            custom: 4
        };

        const presetReports = [];
        const invalidPresets = [];
        let totalReferenced = 0;
        let minPatterns = Infinity;
        let maxPatterns = 0;

        Object.entries(presets).forEach(([presetId, preset]) => {
            const seen = new Set();
            const duplicates = [];
            const missing = [];
            const breakdown = {
                basic: 0,
                professional: 0,
                advanced: 0,
                expert: 0,
                custom: 0,
                other: 0
            };

            (preset.patterns || []).forEach(patternId => {
                totalReferenced += 1;
                if (!this.patterns[patternId]) {
                    missing.push(patternId);
                    return;
                }

                usedCounts[patternId] = (usedCounts[patternId] || 0) + 1;
                if (seen.has(patternId)) {
                    duplicates.push(patternId);
                } else {
                    seen.add(patternId);
                }

                const category = this.patterns[patternId].category || 'other';
                if (breakdown[category] !== undefined) {
                    breakdown[category] += 1;
                } else {
                    breakdown.other += 1;
                }
            });

            minPatterns = Math.min(minPatterns, preset.patterns.length);
            maxPatterns = Math.max(maxPatterns, preset.patterns.length);

            const report = {
                id: presetId,
                name: preset.name,
                patterns: [...(preset.patterns || [])],
                uniquePatterns: seen.size,
                duplicates,
                missing,
                breakdown,
                complexityScore: seen.size === 0
                    ? 0
                    : [...seen].reduce((score, patternId) => {
                        const pattern = this.patterns[patternId];
                        return score + (categoryOrder[pattern?.category] ?? 1);
                    }, 0) / seen.size
            };

            presetReports.push(report);

            if (missing.length > 0 || duplicates.length > 0 || seen.size === 0) {
                invalidPresets.push(report);
            }
        });

        const unusedPatterns = patternIds.filter(id => (usedCounts[id] || 0) === 0);
        const usedPatternCount = patternIds.length - unusedPatterns.length;
        const coverageRatio = patternIds.length === 0
            ? 0
            : +(usedPatternCount / patternIds.length).toFixed(3);

        return {
            presetCount: Object.keys(presets).length,
            patternCount: patternIds.length,
            totalReferences: totalReferenced,
            averagePatternsPerPreset: presetReports.length === 0 ? 0 : +(totalReferenced / presetReports.length).toFixed(2),
            minPatternsPerPreset: isFinite(minPatterns) ? minPatterns : 0,
            maxPatternsPerPreset: maxPatterns,
            coverageRatio,
            unusedPatterns,
            presetReports,
            invalidPresets,
            isValid: invalidPresets.length === 0
        };
    }

    /**
     * Get default selected patterns
     * @returns {Array} Array of pattern IDs that are selected by default
     */
    getDefaultSelectedPatterns() {
        return Object.keys(this.patterns).filter(key => 
            this.patterns[key].defaultSelected
        );
    }

    /**
     * Generate prompt for a specific pattern
     * @param {string} patternId - Pattern ID
     * @param {string} userPrompt - User's original prompt
     * @param {string} improvedPrompt - Improved prompt from Stage 1 (optional)
     * @returns {string} Final prompt for AI execution
     */
    generatePrompt(patternId, userPrompt, improvedPrompt = null) {
        const pattern = this.getPattern(patternId);
        if (!pattern) {
            throw new Error(`Pattern not found: ${patternId}`);
        }

        const basePrompt = improvedPrompt || userPrompt;
        return `${pattern.prompt}\n\n以下の指示に対して上記の思考方法で回答してください：\n${basePrompt}`;
    }

    /**
     * Validate selected patterns
     * @param {Array} selectedPatternIds - Array of selected pattern IDs
     * @returns {Object} Validation result
     */
    validateSelection(selectedPatternIds) {
        const errors = [];
        const validPatterns = [];

        selectedPatternIds.forEach(id => {
            if (this.patterns[id]) {
                validPatterns.push(id);
            } else {
                errors.push(`Invalid pattern ID: ${id}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            validPatterns,
            hasSelection: validPatterns.length > 0
        };
    }

    /**
     * Get execution order for patterns
     * @param {Array} selectedPatternIds - Array of selected pattern IDs
     * @returns {Array} Ordered array of pattern execution info
     */
    getExecutionOrder(selectedPatternIds) {
        const validation = this.validateSelection(selectedPatternIds);
        if (!validation.isValid) {
            throw new Error('Invalid pattern selection: ' + validation.errors.join(', '));
        }

        // Order: Basic patterns first, then expert patterns
        const basicPatterns = [];
        const expertPatterns = [];

        validation.validPatterns.forEach(id => {
            const pattern = this.patterns[id];
            const executionInfo = {
                id: pattern.id,
                name: pattern.name,
                category: pattern.category,
                description: pattern.description
            };

            if (pattern.category === 'basic') {
                basicPatterns.push(executionInfo);
            } else {
                expertPatterns.push(executionInfo);
            }
        });

        return [...basicPatterns, ...expertPatterns];
    }

    /**
     * Add custom pattern (for future extensibility)
     * @param {Object} patternConfig - Custom pattern configuration
     * @returns {boolean} Success status
     */
    addCustomPattern(patternConfig) {
        try {
            const { id, name, category, prompt, description } = patternConfig;
            
            if (!id || !name || !prompt) {
                throw new Error('Missing required pattern fields');
            }

            if (this.patterns[id]) {
                throw new Error('Pattern ID already exists');
            }

            this.patterns[id] = {
                id,
                name,
                category: category || 'custom',
                prompt,
                description: description || '',
                defaultSelected: false,
                custom: true
            };

            return true;
        } catch (error) {
            console.error('Failed to add custom pattern:', error);
            return false;
        }
    }

    /**
     * Remove custom pattern
     * @param {string} id - Pattern ID to remove
     * @returns {boolean} Success status
     */
    removeCustomPattern(id) {
        const pattern = this.patterns[id];
        if (!pattern || !pattern.custom) {
            return false;
        }

        delete this.patterns[id];
        return true;
    }

    /**
     * Export pattern configuration
     * @param {string} patternId - Pattern ID to export
     * @returns {Object|null} Pattern configuration for export
     */
    exportPattern(patternId) {
        const pattern = this.patterns[patternId];
        if (!pattern) {
            return null;
        }

        return {
            id: pattern.id,
            name: pattern.name,
            category: pattern.category,
            prompt: pattern.prompt,
            description: pattern.description,
            custom: pattern.custom || false
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThinkingPatterns;
} else {
    window.ThinkingPatterns = ThinkingPatterns;
}