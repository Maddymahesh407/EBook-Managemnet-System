// Core Application Logic

let currentUser = null;
let cart = [];
const BOOK_COLLECTION = "books";
const CART_COLLECTION = "carts"; // Subcollection of users or separate

// DOM Elements
const bookList = document.getElementById('book-list');
const headerCartCount = document.getElementById('header-cart-count');
const headerCartTotal = document.getElementById('header-cart-total');
const cartItemsBody = document.getElementById('cart-items-body');
const cartGrandTotal = document.getElementById('cart-grand-total');

// Monitor Auth State
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadBooks();
        loadCart();
    } else {
        currentUser = null;
    }
});

// Seed Books if Empty (For Demo)
async function seedBooks() {
    const booksSnapshot = await db.collection(BOOK_COLLECTION).get();
    if (booksSnapshot.empty) {
        const dummyBooks = [
            {
                title: "The Great Gatsby",
                author: "F. Scott Fitzgerald",
                description: "A novel set in the Jazz Age that tells the story of Jay Gatsby.",
                price: 1,
                imageUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7a/The_Great_Gatsby_Cover_1925_Retouched.jpg"
            },
            {
                title: "To Kill a Mockingbird",
                author: "Harper Lee",
                description: "A novel about the serious issues of rape and racial inequality.",
                price: 1,
                imageUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4f/To_Kill_a_Mockingbird_%28first_edition_cover%29.jpg"
            },
            {
                title: "Clean Code",
                author: "Robert C. Martin",
                description: "A Handbook of Agile Software Craftsmanship.",
                price: 1,
                imageUrl: "https://m.media-amazon.com/images/I/41jEbK-jG+L._SX374_BO1,204,203,200_.jpg"
            },
            {
                title: "The Pragmatic Programmer",
                author: "Andrew Hunt",
                description: "Your journey to mastery.",
                price: 1,
                imageUrl: "https://m.media-amazon.com/images/I/51cUVaBWZzL._SX380_BO1,204,203,200_.jpg"
            },
            {
                title: "Harry Potter and the Sorcerer's Stone",
                author: "J.K. Rowling",
                description: "The first novel in the Harry Potter series.",
                price: 1,
                imageUrl: "https://m.media-amazon.com/images/I/81iqZ2HHD-L.jpg"
            },
            {
                title: "Atomic Habits",
                author: "James Clear",
                description: "An Easy & Proven Way to Build Good Habits.",
                price: 1,
                imageUrl: "https://m.media-amazon.com/images/I/91bYsX41DVL.jpg"
            }
        ];

        const batch = db.batch();
        dummyBooks.forEach(book => {
            const docRef = db.collection(BOOK_COLLECTION).doc();
            batch.set(docRef, book);
        });
        await batch.commit();
        console.log("Books seeded");
        loadBooks();
    }
}

// Load Books
async function loadBooks() {
    // Attempt seed first (lazy way to ensure data exists)
    // In production, remove this
    // await seedBooks();

    // For performance, just fetch
    db.collection(BOOK_COLLECTION).onSnapshot((snapshot) => {
        if (snapshot.empty) {
            seedBooks(); // Seed if empty on load
            return;
        }

        bookList.innerHTML = '';
        const seenTitles = new Set();

        snapshot.forEach(doc => {
            const book = doc.data();
            book.id = doc.id;

            // Normalize title to ensure case-insensitive deduplication
            const normalizedTitle = book.title ? book.title.trim().toLowerCase() : "";

            const excludedTitles = new Set(["1984", "the alchemist"]);

            if (normalizedTitle && !seenTitles.has(normalizedTitle) && !excludedTitles.has(normalizedTitle)) {
                seenTitles.add(normalizedTitle);
                renderBookCard(book);
            }
        });
    });
}

function renderBookCard(book) {
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-md-4 col-lg-3 fade-in';
    col.innerHTML = `
        <div class="card book-card h-100">
            <img src="${book.imageUrl}" class="card-img-top" alt="${book.title}" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
            <div class="card-body d-flex flex-column">
                <h5 class="card-title text-truncate">${book.title}</h5>
                <p class="card-text text-muted small">${book.author}</p>
                <div class="mt-auto d-flex justify-content-between align-items-center">
                    <span class="price-tag">₹${book.price.toFixed(2)}</span>
                    <button class="btn btn-sm btn-outline-primary stop-prop" onclick="event.stopPropagation(); addToCart('${book.id}')">
                        <i class="fas fa-plus"></i> Add
                    </button>
                </div>
            </div>
        </div>
    `;
    bookList.appendChild(col);
    // Cache book data for modal
    col.dataset.book = JSON.stringify(book);
}

// Open Book Details (Kept for reference if needed later, but removed from onclick)
window.openBookDetails = function (bookId) {
    // Logic kept but not triggered by card click anymore
    db.collection(BOOK_COLLECTION).doc(bookId).get().then(doc => {
        if (doc.exists) {
            const book = doc.data();
            document.getElementById('modal-book-img').src = book.imageUrl;
            document.getElementById('modal-book-title').innerText = book.title;
            document.getElementById('modal-book-author').innerText = book.author;
            document.getElementById('modal-book-desc').innerText = book.description;
            document.getElementById('modal-book-price').innerText = `₹${book.price.toFixed(2)}`;

            const btn = document.getElementById('modal-add-to-cart-btn');
            btn.onclick = () => {
                addToCart(bookId);
                const modal = bootstrap.Modal.getInstance(document.getElementById('bookDetailModal'));
                modal.hide();
            };

            new bootstrap.Modal(document.getElementById('bookDetailModal')).show();
        }
    });
};

// Cart Logic
async function loadCart() {
    if (!currentUser) return;

    db.collection('users').doc(currentUser.uid).collection('cartItems')
        .onSnapshot((snapshot) => {
            cart = [];
            let totalQty = 0;
            let totalPrice = 0;

            cartItemsBody.innerHTML = '';

            snapshot.forEach(doc => {
                const item = doc.data();
                item.id = doc.id; // bookId
                cart.push(item);

                totalQty += item.qty;
                totalPrice += (item.price * item.qty);

                renderCartItem(item);
            });

            // Update Header
            headerCartCount.innerText = totalQty;
            headerCartTotal.innerText = `₹${totalPrice.toFixed(2)}`;
            cartGrandTotal.innerText = `₹${totalPrice.toFixed(2)}`;
        });
}

function renderCartItem(item) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${item.title}</td>
        <td>₹${item.price.toFixed(2)}</td>
        <td>
            <div class="d-flex align-items-center">
                <button class="btn btn-sm btn-outline-secondary me-2" onclick="updateQty('${item.id}', -1)">-</button>
                <span>${item.qty}</span>
                <button class="btn btn-sm btn-outline-secondary ms-2" onclick="updateQty('${item.id}', 1)">+</button>
            </div>
        </td>
        <td>₹${(item.price * item.qty).toFixed(2)}</td>
        <td>
            <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart('${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    cartItemsBody.appendChild(tr);
}

// Add to Cart with Improved Feedback
window.addToCart = async function (bookId) {
    if (!currentUser) {
        alert("Please login first!");
        return;
    }

    // Feedback UI
    const btn = event.target.closest('button');
    const originalText = btn ? btn.innerHTML : "";
    if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
        btn.disabled = true;
    }

    const cartRef = db.collection('users').doc(currentUser.uid).collection('cartItems').doc(bookId);

    try {
        // Get book details first
        const bookDoc = await db.collection(BOOK_COLLECTION).doc(bookId).get();
        if (!bookDoc.exists) throw new Error("Book not found in database.");
        const book = bookDoc.data();

        // Transaction to update qty
        await db.runTransaction(async (transaction) => {
            const cartDoc = await transaction.get(cartRef);
            if (cartDoc.exists) {
                const newQty = cartDoc.data().qty + 1;
                transaction.update(cartRef, { qty: newQty });
            } else {
                transaction.set(cartRef, {
                    title: book.title,
                    price: Number(book.price),
                    qty: 1,
                    bookId: bookId,
                    imageUrl: book.imageUrl || ""
                });
            }
        });

        console.log("Added to cart");

    } catch (e) {
        console.error("Add to cart failed", e);
        alert("Failed to add to cart: " + e.message);
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// Update Qty
window.updateQty = function (bookId, delta) {
    const cartRef = db.collection('users').doc(currentUser.uid).collection('cartItems').doc(bookId);
    db.runTransaction(async (transaction) => {
        const doc = await transaction.get(cartRef);
        if (!doc.exists) return; // Should not happen

        const newQty = doc.data().qty + delta;

        if (newQty <= 0) {
            transaction.delete(cartRef);
        } else {
            transaction.update(cartRef, { qty: newQty });
        }
    }).catch(console.error);
}

// Remove
window.removeFromCart = function (bookId) {
    db.collection('users').doc(currentUser.uid).collection('cartItems').doc(bookId).delete();
}
