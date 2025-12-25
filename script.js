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
            color: 0x222222, // Fallback dark grey color
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

// Grid Helper for premium feel
const grid = new THREE.GridHelper(50, 50, 0x1e1e1e, 0x0a0a0a);
grid.position.y = -0.05;
scene.add(grid);

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
const levitatingCards = new Set();
let focusedCard = null;
let isRotatingCard = false;
let previousMouseX = 0;
let previousMouseY = 0;

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

        // If we click the CURRENTLY focused card, we rotate it
        if (focusedCard === selectedObject) {
            isRotatingCard = true;
            previousMouseX = event.clientX;
            previousMouseY = event.clientY;
            gsap.killTweensOf(focusedCard.rotation);
        } else if (!selectedObject.userData.isRising) {
            // If we click a DIFFERENT card that isn't already rising, switch focus to it
            riseCard(selectedObject);
        }
    } else if (focusedCard) {
        // Clicking the background when a card is focused still lets you rotate it?
        // Let's allow rotation by dragging anywhere if focused, as requested
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

window.addEventListener('pointerup', () => {
    if (isRotatingCard) {
        isRotatingCard = false;
        returnCardToPerpendicular();
    }
});

// Press Escape to re-enable camera
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        focusedCard = null;
        controls.enabled = true;
        // Return camera and controls target to center
        gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.inOut" });
        gsap.to(camera.position, { x: 8, y: 8, z: 12, duration: 1.5, ease: "power2.inOut" });
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

function riseCard(card) {
    focusedCard = card;
    controls.enabled = false; // Freeze the camera immediately

    // Calculate target position: much higher and more centered over the deck
    const targetY = 8; // Increased height
    const targetX = (Math.random() - 0.5) * 1.5; // More centered
    const targetZ = (Math.random() - 0.5) * 1.5; // More centered

    // Sequence: Lift up, rotate to face camera, then start floating
    const tl = gsap.timeline({
        onComplete: () => {
            // Only start floating logic AFTER the animation is done
            levitatingCards.add(card);
            card.userData.floatOffset = Math.random() * Math.PI * 2;
            card.userData.floatSpeed = 0.5 + Math.random() * 0.5;
            card.userData.baseY = targetY;
            card.userData.isFloating = true;
            card.userData.isRising = false; // Reset rising flag
        }
    });

    // Mark card as rising to prevent multiple triggers or float conflicts
    card.userData.isRising = true;

    // Animate card position
    tl.to(card.position, {
        x: targetX,
        y: targetY,
        z: targetZ,
        duration: 1.5,
        ease: "power3.out"
    });

    // Animate card rotation to face the camera perfectly
    tl.to(card.rotation, {
        x: 0, // front face (pos-z) will point towards pos-z
        y: 0,
        z: 0,
        duration: 1,
        ease: "back.out(1.7)"
    }, "-=1.0");

    // Focus camera on the rising card
    tl.to(controls.target, {
        x: targetX,
        y: targetY,
        z: targetZ,
        duration: 1.5,
        ease: "power3.inOut"
    }, 0);

    // Move camera to be PERPENDICULAR to the card face
    tl.to(camera.position, {
        x: targetX,
        y: targetY,
        z: targetZ + 14,
        duration: 1.5,
        ease: "power3.inOut"
    }, 0);
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

    // Animate levitating cards
    levitatingCards.forEach(card => {
        const offset = card.userData.floatOffset;
        const speed = card.userData.floatSpeed;
        const baseY = card.userData.baseY;

        // Subtle levitation
        card.position.y = baseY + Math.sin(elapsedTime * speed + offset) * 0.3;
        card.rotation.z += Math.cos(elapsedTime * 0.5) * 0.002;
    });

    renderer.render(scene, camera);
}

animate();
