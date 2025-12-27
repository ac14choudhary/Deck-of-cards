/**
 * Premium 3D Card Deck Rebuild
 * Using Three.js and GSAP
 */

// Scene Constants
const CARD_WIDTH = 2.5;
const CARD_HEIGHT = 3.5;
const CARD_THICKNESS = 0.006;
const STACK_SPACING = 0.008;
const TOTAL_CARDS = 52;

// Initialize Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 8, 12);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Orbit Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 30;
controls.minDistance = 5;
controls.maxPolarAngle = Math.PI / 2; // Prevents camera from going below the plane

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 1);
spotLight.position.set(10, 15, 10);
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;
spotLight.shadow.bias = -0.0001;
scene.add(spotLight);

const rimLight = new THREE.PointLight(0x3b82f6, 0.5);
rimLight.position.set(-10, 5, -5);
scene.add(rimLight);

// Texture Generation
function createCardTexture(rank, suit, isFront = true) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 712;
    const ctx = canvas.getContext('2d');

    if (isFront) {
        // Front Design
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Border
        ctx.strokeStyle = '#eeeeee';
        ctx.lineWidth = 10;
        ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

        const color = (suit === '♥' || suit === '♦') ? '#e11d48' : '#0f172a';
        ctx.fillStyle = color;

        // Large Center Icon
        ctx.font = '280px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(suit, canvas.width / 2, canvas.height / 2 + 30);

        // Rank text
        ctx.font = '60px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(rank, 40, 80);
        ctx.font = '40px Arial';
        ctx.fillText(suit, 40, 120);

        // Bottom right (rotated)
        ctx.save();
        ctx.translate(canvas.width, canvas.height);
        ctx.rotate(Math.PI);
        ctx.font = '60px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(rank, 40, 80);
        ctx.font = '40px Arial';
        ctx.fillText(suit, 40, 120);
        ctx.restore();

    } else {
        // Back Design
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#1e1e1e');
        grad.addColorStop(0.5, '#2d2d2d');
        grad.addColorStop(1, '#1e1e1e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Geometric Pattern
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.2;
        for (let i = 0; i < canvas.width; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(canvas.width - i, canvas.height);
            ctx.stroke();
        }

        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 15;
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

        ctx.fillStyle = '#3b82f6';
        ctx.font = '100px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('AG', canvas.width / 2, canvas.height / 2 + 35);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
}

// Card Groups
const deckGroup = new THREE.Group();
scene.add(deckGroup);

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const cards = [];

// Shared materials for efficiency
const textureLoader = new THREE.TextureLoader();
const loadingManager = new THREE.LoadingManager();

loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
    console.log('Started loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
};

loadingManager.onLoad = () => {
    console.log('Loading complete!');
};

loadingManager.onError = (url) => {
    console.error('There was an error loading ' + url);
};

const backTexture = textureLoader.load('assets/card_back.jpg', (tex) => {
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    // Use sRGBEncoding for better color accuracy (r128 compatible)
    tex.encoding = THREE.sRGBEncoding;
    console.log('Card back texture loaded successfully');
});

const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.2 });

function createCard(rank, suit, index) {
    const geometry = new THREE.BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS);
    const frontTexture = createCardTexture(rank, suit, true);

    const materials = [
        edgeMaterial, // right
        edgeMaterial, // left
        edgeMaterial, // top
        edgeMaterial, // bottom
        new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.3 }), // front
        new THREE.MeshStandardMaterial({
            map: backTexture,
            color: 0xffffff, // White color to show texture clearly
            roughness: 0.3
        })   // back
    ];

    const card = new THREE.Mesh(geometry, materials);
    card.castShadow = true;
    card.receiveShadow = true;

    card.rotation.x = -Math.PI / 2; // Flat on the table

    // Store identity for shuffling
    card.userData = { rank, suit };

    return card;
}

// Generate Deck
let currentIdx = 0;
suits.forEach(suit => {
    ranks.forEach(rank => {
        const card = createCard(rank, suit, currentIdx);
        cards.push(card);
        currentIdx++;
    });
});

// Shuffle Cards (Fisher-Yates)
for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
}

// Pin Ace of Spades to Top (last index)
const aceOfSpadesIdx = cards.findIndex(c => c.userData.rank === 'A' && c.userData.suit === '♠');
if (aceOfSpadesIdx !== -1) {
    const aceOfSpades = cards.splice(aceOfSpadesIdx, 1)[0];
    cards.push(aceOfSpades);
}

// Add shuffled cards to scene and set final stack positions
cards.forEach((card, i) => {
    card.position.y = i * STACK_SPACING;
    deckGroup.add(card);
});

// Center the deck height slightly above floor
deckGroup.position.y = 0.05;

// Floor
const floorGeo = new THREE.PlaneGeometry(50, 50);
const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.8,
    metalness: 0.2
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.1;
floor.receiveShadow = true;
scene.add(floor);

// Entry Animation with GSAP
gsap.from(camera.position, {
    x: 20,
    y: 20,
    z: 30,
    duration: 3,
    ease: "power3.inOut"
});

cards.forEach((card, i) => {
    // Linear approach: Start directly above final position
    const finalY = card.position.y;

    // Set initial state: Straight above, no extra rotation
    card.position.y = finalY + 15;

    // Ensure card materials are ready for opacity animation if not already
    card.material.forEach(m => {
        m.transparent = true;
        m.opacity = 0;
    });

    // Simple Linear vertical drop timeline
    const tl = gsap.timeline({ delay: i * 0.05 });

    tl.to(card.position, {
        y: finalY,
        duration: 0.8,
        ease: "power2.in"
    });

    // Fade in
    tl.to(card.material, {
        opacity: 1,
        duration: 0.4,
    }, 0);
});

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Interaction Variables
const handCards = []; // Array of cards currently in the "hand"
let focusedCard = null;
let isRotatingCard = false;
let previousMouseX = 0;
let previousMouseY = 0;

const HAND_SPACING = 3.2; // Spacing between cards in the hand
const HAND_Y = 8; // Height of cards in the hand

// Orbit Controls Events for Mode Management
controls.addEventListener('start', () => {
    // If we have a focused card and we're not explicitly "card rotating", 
    // we might want to disable OrbitControls if the user clicks the card area.
    // For now, let's allow OrbitControls but prioritize card rotation if clicking the card.
    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(controls.target);
});

renderer.domElement.addEventListener('pointerdown', (event) => {
    // Calculate mouse position
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(cards);

    if (intersects.length > 0) {
        const selectedObject = intersects[0].object;

        // Check if its already in the hand
        const handIndex = handCards.indexOf(selectedObject);

        if (handIndex !== -1) {
            // If already in hand, focus it or start rotating if already focused
            if (focusedCard === selectedObject) {
                isRotatingCard = true;
                previousMouseX = event.clientX;
                previousMouseY = event.clientY;
                gsap.killTweensOf(focusedCard.rotation);
            } else {
                switchFocus(selectedObject);
            }
        } else if (!selectedObject.userData.isRising) {
            // New card from deck
            addCardToHand(selectedObject);
        }
    } else if (focusedCard) {
        // Dragging background rotates focused card
        isRotatingCard = true;
        previousMouseX = event.clientX;
        previousMouseY = event.clientY;
        gsap.killTweensOf(focusedCard.rotation);
    }
});

window.addEventListener('pointermove', (event) => {
    if (!isRotatingCard || !focusedCard) return;

    const deltaX = event.clientX - previousMouseX;
    const deltaY = event.clientY - previousMouseY;

    // Rotate card on its local axes
    focusedCard.rotation.y += deltaX * 0.01;
    focusedCard.rotation.x += deltaY * 0.01;

    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
});

// Cursor Hover Effect
renderer.domElement.addEventListener('pointermove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(cards);
    if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
    } else {
        document.body.style.cursor = 'default';
    }
});

window.addEventListener('pointerup', () => {
    if (isRotatingCard) {
        isRotatingCard = false;
        returnCardToPerpendicular();
    }
});

// Press Escape to re-enable camera and clear hand
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        handCards.length = 0;
        focusedCard = null;
        controls.enabled = true;

        // Reset camera
        gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.inOut" });
        gsap.to(camera.position, { x: 8, y: 8, z: 12, duration: 1.5, ease: "power2.inOut" });

        // Optionally return cards to deck? 
        // For now, let's just let them stay or reset their states if we wanted to fully clear.
    }
});

function returnCardToPerpendicular() {
    if (!focusedCard) return;
    gsap.to(focusedCard.rotation, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1,
        ease: "back.out(1.7)"
    });
}

// Zoom Functionality for Focused Card
window.addEventListener('wheel', (event) => {
    if (!focusedCard) return;

    // Adjust camera Z based on scroll
    // Using a factor for sensitivity
    const zoomSpeed = 0.05;
    const delta = event.deltaY * zoomSpeed;

    // Target Z position (perpendicular to card face)
    const currentZ = camera.position.z;
    const targetBaseZ = focusedCard.position.z;

    // Clamp distance between 5 and 25
    let newZ = currentZ + delta;
    newZ = Math.max(targetBaseZ + 5, Math.min(targetBaseZ + 25, newZ));

    camera.position.z = newZ;
});

function addCardToHand(card) {
    if (handCards.includes(card)) return;

    // Insert new card in the middle of the hand array
    const midIndex = Math.floor(handCards.length / 2);
    handCards.splice(midIndex, 0, card);

    card.userData.isRising = true;
    focusedCard = card;
    controls.enabled = false;

    // Initialize base coordinates to current physical position
    // This provides a seamless handover to the bobbing logic
    card.userData.baseX = card.position.x;
    card.userData.baseY = card.position.y;
    card.userData.baseZ = card.position.z;

    const currentTime = clock.getElapsedTime();
    const speed = 0.5 + Math.random() * 0.5;
    card.userData.floatSpeed = speed;
    // Set offset so sin starts at 0 right now relative to current baseY
    card.userData.floatOffset = -(currentTime * speed);
    card.userData.isFloating = true;

    updateHandPositions();
}

const FOCUS_PADDING = 1.0; // Extra space around focused card
const FOCUS_Z = 1.5;     // How much closer focused card comes

function switchFocus(card) {
    if (focusedCard === card) return;
    focusedCard = card;
    controls.enabled = false;

    // To make the selected card go "in the middle", we re-order the handCards array
    const oldIndex = handCards.indexOf(card);
    if (oldIndex !== -1) {
        handCards.splice(oldIndex, 1);
        const midIndex = Math.floor(handCards.length / 2);
        handCards.splice(midIndex, 0, card);
    }

    // Re-calculate positions to apply padding/depth and the new centered order
    updateHandPositions();
}

function updateHandPositions() {
    const totalHalfWidth = ((handCards.length - 1) * HAND_SPACING) / 2;
    const focusIdx = handCards.indexOf(focusedCard);

    handCards.forEach((card, index) => {
        let targetX = (index * HAND_SPACING) - totalHalfWidth;
        // Basic layering based on order in the hand
        let targetZ = index * 0.05;

        // Apply padding and extra depth if focused
        if (focusedCard && focusIdx !== -1) {
            if (index < focusIdx) {
                targetX -= FOCUS_PADDING;
            } else if (index > focusIdx) {
                targetX += FOCUS_PADDING;
            } else {
                // This is the focused card
                targetZ += FOCUS_Z;
            }
        }

        const targetY = HAND_Y;

        // COLLISION AVOIDANCE logic
        const currentBaseX = card.userData.baseX || card.position.x;
        const isTraveling = Math.abs(targetX - currentBaseX) > 0.5;

        // Define temporary lanes for the glide
        let moveZ = targetZ;
        if (isTraveling) {
            if (card === focusedCard) {
                moveZ = targetZ + 1.2; // Glide over
            } else {
                moveZ = -1.5; // Glide under
            }
        }

        // Kill existing BASE coordinate tweens and card rotation
        gsap.killTweensOf(card.userData);
        gsap.killTweensOf(card.rotation);

        // Animate horizontal and vertical position
        gsap.to(card.userData, {
            baseX: targetX,
            baseY: targetY,
            duration: 1.2,
            ease: "power3.out",
            onComplete: () => {
                card.userData.isRising = false;
            }
        });

        // Lane Logic: Pop out/dip back during horizontal travel, then settle
        if (isTraveling) {
            const tl = gsap.timeline();
            tl.to(card.userData, { baseZ: moveZ, duration: 0.4, ease: "power2.out" });
            tl.to(card.userData, { baseZ: targetZ, duration: 0.8, ease: "power2.inOut" });
        } else {
            gsap.to(card.userData, { baseZ: targetZ, duration: 1.2, ease: "power3.out" });
        }

        gsap.to(card.rotation, {
            x: 0,
            y: 0,
            z: 0,
            duration: 1.0,
            ease: "power2.out"
        });

        // If this is the focused card, sync camera to its moving BASE
        if (card === focusedCard) {
            gsap.to(controls.target, {
                x: targetX,
                y: targetY,
                z: targetZ,
                duration: 1.2,
                ease: "power3.out"
            });

            gsap.to(camera.position, {
                x: targetX,
                y: targetY,
                z: targetZ + 14,
                duration: 1.2,
                ease: "power3.out"
            });
        }
    });
}

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render Loop
let clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    controls.update();

    // Animate hand cards
    handCards.forEach(card => {
        const offset = card.userData.floatOffset || 0;
        const speed = card.userData.floatSpeed || 0.5;
        const baseY = card.userData.baseY !== undefined ? card.userData.baseY : card.position.y;
        const baseX = card.userData.baseX !== undefined ? card.userData.baseX : card.position.x;
        const baseZ = card.userData.baseZ !== undefined ? card.userData.baseZ : card.position.z;

        // Always apply subtle levitation relative to the base (which might be moving!)
        card.position.y = baseY + Math.sin(elapsedTime * speed + offset) * 0.2;
        card.position.x = baseX + Math.cos(elapsedTime * speed * 0.5 + offset) * 0.1;
        card.position.z = baseZ;

        // Only apply automatic rotation bobbing if the user isn't manually rotating
        if (!(isRotatingCard && card === focusedCard)) {
            card.rotation.z = Math.cos(elapsedTime * 0.5 + offset) * 0.01;
        }
    });

    renderer.render(scene, camera);
}

animate();
