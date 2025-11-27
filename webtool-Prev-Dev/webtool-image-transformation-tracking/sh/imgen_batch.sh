#!/bin/bash

# Image Generator Batch Script (Nano-Banana)
# Generate multiple styled images from reference image(s) using Replicate API
# Uses: Google Nano-Banana model

# Don't use set -e to allow continuation on API failures
# set -e

# Color handling (disable if no TTY or NO_COLOR)
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
    ESC=$(printf '\033')
    RED="${ESC}[0;31m"
    GREEN="${ESC}[0;32m"
    YELLOW="${ESC}[1;33m"
    BLUE="${ESC}[0;34m"
    CYAN="${ESC}[0;36m"
    NC="${ESC}[0m"
else
    RED=""; GREEN=""; YELLOW=""; BLUE=""; CYAN=""; NC="";
fi

# Default values
OUTPUT_DIR="./output"
NUM_PROMPTS=""
RANDOM_MODE=false
SETUP_MODE=false
SAVE_METADATA=true
ASPECT_RATIO="match_input_image"
OUTPUT_FORMAT="png"

# Help output (split into args and examples)
usage_args() {
    cat << EOF
${BLUE}Image Generator Batch Script (Nano-Banana)${NC}
Generate multiple styled images from reference image(s) using Google Nano-Banana

${CYAN}USAGE:${NC}
  imgen_batch.sh [OPTIONS]

${CYAN}REQUIRED OPTIONS:${NC}
  -i, --input-image PATH    Input reference image (file path or URL)
                            Can be specified multiple times for multiple images
  -p, --prompt-file PATH    Text file containing prompts (one per line)

${CYAN}OPTIONAL OPTIONS:${NC}
  -o, --output-dir PATH     Output directory (default: ./output)
  -n, --num-prompts NUM     Number of prompts to execute (default: all)
  -r, --random              Use random prompts (requires -n)
  --no-metadata             Do not save metadata .txt files

${CYAN}IMAGE SETTINGS:${NC}
  -a, --aspect-ratio RATIO  Aspect ratio (default: match_input_image)
                            Options: match_input_image, 1:1, 2:3, 3:2, 3:4, 4:3,
                                     4:5, 5:4, 9:16, 16:9, 21:9
  -f, --format FORMAT       Output format: jpg|png (default: png)

${CYAN}SETUP:${NC}
  --setup                   Interactive setup (configure API token)
  -h, --help                Show this help (arguments)
  -ht, --help-examples      Show examples only

${CYAN}OUTPUT:${NC}
  Images are saved as: prompt_NNN_YYYY-MMDD-HHMMSS.<format> (JST)
  Where NNN is the line number from the prompt file (001, 002, etc.)
EOF
}

usage_examples() {
    cat << EOF
${CYAN}EXAMPLES:${NC}
  ${YELLOW}# Initial setup (first time only)${NC}
  imgen_batch.sh --setup

  ${YELLOW}# Generate all prompts${NC}
  imgen_batch.sh -i photo.jpg -p prompts.txt

  ${YELLOW}# Multiple input images${NC}
  imgen_batch.sh -i photo1.jpg -i photo2.jpg -p prompts.txt

  ${YELLOW}# Random 5 prompts with aspect ratio${NC}
  imgen_batch.sh -i photo.jpg -p prompts.txt -n 5 -r -a 16:9

  ${YELLOW}# JPG output format${NC}
  imgen_batch.sh -i photo.jpg -p prompts.txt -f jpg

  ${YELLOW}# Without metadata files${NC}
  imgen_batch.sh -i photo.jpg -p prompts.txt --no-metadata
EOF
}

# Setup function for API token
setup_api_token() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Image Generator - Setup${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    if [ -n "$REPLICATE_API_TOKEN" ]; then
        echo -e "${GREEN}✓ REPLICATE_API_TOKEN is already set${NC}"
        echo ""
        read -p "Do you want to update it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Setup cancelled."
            exit 0
        fi
    fi
    
    echo -e "${YELLOW}Get your API token from:${NC}"
    echo "https://replicate.com/account/api-tokens"
    echo ""
    
    read -p "Enter your Replicate API token: " API_TOKEN
    
    if [ -z "$API_TOKEN" ]; then
        echo -e "${RED}Error: No token provided${NC}"
        exit 1
    fi
    
    # Detect shell config file
    if [ -n "$ZSH_VERSION" ]; then
        SHELL_CONFIG="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ]; then
        SHELL_CONFIG="$HOME/.bashrc"
    else
        SHELL_CONFIG="$HOME/.profile"
    fi
    
    echo ""
    echo -e "${YELLOW}Adding to $SHELL_CONFIG...${NC}"
    
    # Remove old token if exists
    if [ -f "$SHELL_CONFIG" ]; then
        grep -v "REPLICATE_API_TOKEN" "$SHELL_CONFIG" > "$SHELL_CONFIG.tmp" || true
        mv "$SHELL_CONFIG.tmp" "$SHELL_CONFIG"
    fi
    
    # Add new token
    echo "" >> "$SHELL_CONFIG"
    echo "# Replicate API Token (added by imgen_batch.sh)" >> "$SHELL_CONFIG"
    echo "export REPLICATE_API_TOKEN='$API_TOKEN'" >> "$SHELL_CONFIG"
    
    echo -e "${GREEN}✓ Token saved to $SHELL_CONFIG${NC}"
    echo ""
    echo -e "${YELLOW}To activate the token, run:${NC}"
    echo "source $SHELL_CONFIG"
    echo ""
    echo -e "${YELLOW}Or simply restart your terminal.${NC}"
    echo ""
    
    # Set for current session
    export REPLICATE_API_TOKEN="$API_TOKEN"
    
    echo -e "${GREEN}✓ Token is also active for this session${NC}"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Setup Complete!${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "You can now use the generator:"
    echo "  imgen_batch.sh -i photo.jpg -p prompts.txt"
    echo ""
    
    exit 0
}

# Parse arguments
INPUT_IMAGES=()
PROMPTS_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--input-image)
            INPUT_IMAGES+=("$2")
            shift 2
            ;;
        -p|--prompt-file)
            PROMPTS_FILE="$2"
            shift 2
            ;;
        -o|--output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -a|--aspect-ratio)
            ASPECT_RATIO="$2"
            shift 2
            ;;
        -f|--format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        -n|--num-prompts)
            NUM_PROMPTS="$2"
            shift 2
            ;;
        -r|--random)
            RANDOM_MODE=true
            shift
            ;;
        --no-metadata)
            SAVE_METADATA=false
            shift
            ;;
        --setup)
            setup_api_token
            ;;
        -h|--help)
            usage_args
            exit 0
            ;;
        -ht|-htest|--help-examples)
            usage_examples
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option: $1${NC}"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ ${#INPUT_IMAGES[@]} -eq 0 ] || [ -z "$PROMPTS_FILE" ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo ""
    echo "First time? Run setup:"
    echo "  imgen_batch.sh --setup"
    echo ""
    echo "Usage example:"
    echo "  imgen_batch.sh -i photo.jpg -p prompts.txt"
    echo ""
    echo "Use -h or --help for full usage information"
    exit 1
fi

# Check API token
if [ -z "$REPLICATE_API_TOKEN" ]; then
    echo -e "${RED}Error: REPLICATE_API_TOKEN is not set${NC}"
    echo ""
    echo "Run setup to configure your API token:"
    echo "  imgen_batch.sh --setup"
    echo ""
    echo "Or set it manually:"
    echo "  export REPLICATE_API_TOKEN='your_token_here'"
    echo ""
    exit 1
fi

# Validate input images
for INPUT_IMAGE in "${INPUT_IMAGES[@]}"; do
    if [ ! -f "$INPUT_IMAGE" ] && [[ ! "$INPUT_IMAGE" =~ ^https?:// ]]; then
        echo -e "${RED}Error: Input image '$INPUT_IMAGE' not found${NC}"
        exit 1
    fi
done

# Validate prompts file
if [ ! -f "$PROMPTS_FILE" ]; then
    echo -e "${RED}Error: Prompts file '$PROMPTS_FILE' not found${NC}"
    exit 1
fi

# Validate aspect ratio
VALID_RATIOS="match_input_image|1:1|2:3|3:2|3:4|4:3|4:5|5:4|9:16|16:9|21:9"
if [[ ! "$ASPECT_RATIO" =~ ^($VALID_RATIOS)$ ]]; then
    echo -e "${RED}Error: Invalid aspect ratio '$ASPECT_RATIO'${NC}"
    echo "Valid options: match_input_image, 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9"
    exit 1
fi

# Validate output format
if [[ ! "$OUTPUT_FORMAT" =~ ^(jpg|png)$ ]]; then
    echo -e "${RED}Error: Invalid output format '$OUTPUT_FORMAT'. Must be: jpg or png${NC}"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Handle image URLs or convert to base64
IMAGE_URLS=()
for INPUT_IMAGE in "${INPUT_IMAGES[@]}"; do
    if [[ "$INPUT_IMAGE" =~ ^https?:// ]]; then
        IMAGE_URLS+=("$INPUT_IMAGE")
        echo -e "${GREEN}✓ Using image URL: $INPUT_IMAGE${NC}"
    else
        echo -e "${YELLOW}Converting local image to base64: $INPUT_IMAGE...${NC}"
        # Mac and Linux compatibility for base64
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            IMAGE_BASE64="data:image/jpeg;base64,$(base64 -i "$INPUT_IMAGE")"
        else
            # Linux
            IMAGE_BASE64="data:image/jpeg;base64,$(base64 -w 0 "$INPUT_IMAGE")"
        fi
        IMAGE_URLS+=("$IMAGE_BASE64")
        echo -e "${GREEN}✓ Image encoded${NC}"
    fi
done

# Read all prompts into array (filter empty lines and comments)
# Compatible with bash 3.x (macOS default) and macOS grep
ALL_PROMPTS=()
while IFS= read -r line; do
    # Skip empty lines and lines starting with #
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    ALL_PROMPTS+=("$line")
done < "$PROMPTS_FILE"
TOTAL_PROMPTS=${#ALL_PROMPTS[@]}

if [ $TOTAL_PROMPTS -eq 0 ]; then
    echo -e "${RED}Error: No prompts found in file${NC}"
    exit 1
fi

# Determine which prompts to execute
declare -a PROMPT_INDICES

if [ -z "$NUM_PROMPTS" ]; then
    # Execute all prompts
    for i in $(seq 0 $((TOTAL_PROMPTS - 1))); do
        PROMPT_INDICES+=($i)
    done
    EXECUTION_MODE="all"
else
    # Execute specified number
    if [ "$NUM_PROMPTS" -gt "$TOTAL_PROMPTS" ]; then
        echo -e "${YELLOW}Warning: Requested $NUM_PROMPTS prompts, but only $TOTAL_PROMPTS available${NC}"
        NUM_PROMPTS=$TOTAL_PROMPTS
    fi
    
    if [ "$RANDOM_MODE" = true ]; then
        # Random selection
        EXECUTION_MODE="random $NUM_PROMPTS"
        TEMP_INDICES=($(seq 0 $((TOTAL_PROMPTS - 1))))
        
        for i in $(seq 1 $NUM_PROMPTS); do
            RANDOM_INDEX=$((RANDOM % ${#TEMP_INDICES[@]}))
            PROMPT_INDICES+=(${TEMP_INDICES[$RANDOM_INDEX]})
            # Remove selected index
            TEMP_INDICES=("${TEMP_INDICES[@]:0:$RANDOM_INDEX}" "${TEMP_INDICES[@]:$((RANDOM_INDEX + 1))}")
        done
    else
        # First N prompts
        EXECUTION_MODE="first $NUM_PROMPTS"
        for i in $(seq 0 $((NUM_PROMPTS - 1))); do
            PROMPT_INDICES+=($i)
        done
    fi
fi

NUM_TO_EXECUTE=${#PROMPT_INDICES[@]}

# Set API URL for nano-banana
API_URL="https://api.replicate.com/v1/models/google/nano-banana/predictions"

# Display execution plan
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Nano-Banana Batch Processing${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Input images:${NC}       ${#INPUT_IMAGES[@]} image(s)"
for img in "${INPUT_IMAGES[@]}"; do
    echo -e "${CYAN}  -${NC} $img"
done
echo -e "${CYAN}Prompt file:${NC}        $PROMPTS_FILE"
echo -e "${CYAN}Output dir:${NC}         $OUTPUT_DIR"
echo -e "${CYAN}Aspect ratio:${NC}       $ASPECT_RATIO"
echo -e "${CYAN}Output format:${NC}      $OUTPUT_FORMAT"
echo -e "${CYAN}Total prompts:${NC}      $TOTAL_PROMPTS"
echo -e "${CYAN}Executing:${NC}          $NUM_TO_EXECUTE ($EXECUTION_MODE)"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Counters
SUCCESS_COUNT=0
FAIL_COUNT=0
CURRENT=1

# Process each selected prompt
for PROMPT_INDEX in "${PROMPT_INDICES[@]}"; do
    # Get prompt
    PROMPT="${ALL_PROMPTS[$PROMPT_INDEX]}"
    PROMPT_NUMBER=$((PROMPT_INDEX + 1))
    
    echo -e "${BLUE}[$CURRENT/$NUM_TO_EXECUTE]${NC} Processing prompt #${PROMPT_NUMBER}"
    echo -e "${YELLOW}Prompt:${NC} ${PROMPT:0:80}..."
    
    # Create filename with prompt number
    # JST timestamp for filenames, e.g., 2025-1017-011000
    TIMESTAMP=$(TZ=Asia/Tokyo date +%Y-%m%d-%H%M%S)
    PROMPT_NUM_PADDED=$(printf "%03d" $PROMPT_NUMBER)
    OUTPUT_FILE="$OUTPUT_DIR/prompt_${PROMPT_NUM_PADDED}_${TIMESTAMP}.png"
    
    # Build JSON payload and save to temp file (avoid "Argument list too long" error)
    TEMP_JSON="/tmp/imgen_payload_${TIMESTAMP}.json"

    # Nano-Banana payload - build image_input array
    IMAGE_INPUT_JSON=$(printf '"%s",' "${IMAGE_URLS[@]}" | sed 's/,$//')
    
    cat > "$TEMP_JSON" << EOF
{
  "input": {
    "prompt": "$PROMPT",
    "image_input": [$IMAGE_INPUT_JSON],
    "aspect_ratio": "$ASPECT_RATIO",
    "output_format": "$OUTPUT_FORMAT"
  }
}
EOF

    # Make API request using file
    echo -e "${YELLOW}Calling API...${NC}"
    RESPONSE=$(curl --silent --show-error \
        "$API_URL" \
        --request POST \
        --header "Authorization: Bearer $REPLICATE_API_TOKEN" \
        --header "Content-Type: application/json" \
        --header "Prefer: wait" \
        --data @"$TEMP_JSON" 2>&1) || {
        echo -e "${RED}✗ API request failed${NC}"
        echo "$RESPONSE"
        rm -f "$TEMP_JSON"
        ((FAIL_COUNT++))
        ((CURRENT++))
        echo ""
        continue
    }

    # Cleanup temp file
    rm -f "$TEMP_JSON"
    
    # Check for errors
    if echo "$RESPONSE" | grep -q '"status":"failed"'; then
        echo -e "${RED}✗ Generation failed${NC}"
        echo "$RESPONSE" | grep -o '"error":"[^"]*"'
        ((FAIL_COUNT++))
        ((CURRENT++))
        echo ""
        continue
    fi
    
    # Extract output URL(s) - can be .png or .jpg
    OUTPUT_URLS=($(echo "$RESPONSE" | grep -o 'https://replicate\.delivery/[^"]*\.\(png\|jpg\|jpeg\)'))
    
    if [ ${#OUTPUT_URLS[@]} -eq 0 ]; then
        echo -e "${RED}✗ Failed to extract output URL${NC}"
        echo "Response: ${RESPONSE:0:500}..."
        ((FAIL_COUNT++))
        ((CURRENT++))
        echo ""
        continue
    fi
    
    # Download image(s)
    echo -e "${YELLOW}Downloading ${#OUTPUT_URLS[@]} image(s)...${NC}"
    
    if [ ${#OUTPUT_URLS[@]} -eq 1 ]; then
        # Single image
        if curl --silent --show-error -o "$OUTPUT_FILE" "${OUTPUT_URLS[0]}"; then
            echo -e "${GREEN}✓ Saved: prompt_${PROMPT_NUM_PADDED}_${TIMESTAMP}.png${NC}"
            ((SUCCESS_COUNT++))
        else
            echo -e "${RED}✗ Download failed${NC}"
            ((FAIL_COUNT++))
        fi
    else
        # Multiple images
        SUCCESS=true
        for idx in "${!OUTPUT_URLS[@]}"; do
            IMG_NUM=$((idx + 1))
            MULTI_OUTPUT_FILE="$OUTPUT_DIR/prompt_${PROMPT_NUM_PADDED}_${TIMESTAMP}_img${IMG_NUM}.png"
            
            if curl --silent --show-error -o "$MULTI_OUTPUT_FILE" "${OUTPUT_URLS[$idx]}"; then
                echo -e "${GREEN}✓ Saved: prompt_${PROMPT_NUM_PADDED}_${TIMESTAMP}_img${IMG_NUM}.png${NC}"
            else
                echo -e "${RED}✗ Download failed for image $IMG_NUM${NC}"
                SUCCESS=false
            fi
        done
        
        if [ "$SUCCESS" = true ]; then
            ((SUCCESS_COUNT++))
        else
            ((FAIL_COUNT++))
        fi
    fi
    
    # Save prompt metadata (if enabled)
    if [ "$SAVE_METADATA" = true ]; then
        PROMPT_FILE="${OUTPUT_FILE%.png}.txt"
        cat > "$PROMPT_FILE" << EOF
Model: Nano-Banana
Prompt Number: $PROMPT_NUMBER
Line Number: $((PROMPT_INDEX + 1))
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')
Input Images: ${#INPUT_IMAGES[@]}
Aspect Ratio: $ASPECT_RATIO
Output Format: $OUTPUT_FORMAT
Generated Images: ${#OUTPUT_URLS[@]}

Input Images:
$(for img in "${INPUT_IMAGES[@]}"; do echo "  - $img"; done)

Prompt:
$PROMPT
EOF
    fi
    
    ((CURRENT++))
    echo ""
    
    # Rate limiting delay
    if [ $CURRENT -le $NUM_TO_EXECUTE ]; then
        sleep 2
    fi
done

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Generation Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Successful:${NC} $SUCCESS_COUNT"
echo -e "${RED}✗ Failed:${NC}     $FAIL_COUNT"
echo -e "${CYAN}Output directory:${NC} $OUTPUT_DIR"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
