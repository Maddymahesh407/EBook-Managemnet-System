// Payment Simulation Logic

const proceedBtn = document.getElementById('proceed-payment-btn');
const paymentModalEl = document.getElementById('paymentModal');
const paymentAmount = document.getElementById('payment-amount');
const paymentTimerRef = document.getElementById('payment-timer');
let paymentModal; // Bootstrap modal instance
let currentOrderId = null;
let paymentTimeout = null;
let countDownInterval = null;

if (proceedBtn) {
    proceedBtn.addEventListener('click', async () => {
        if (cart.length === 0) {
            alert("Cart is empty!");
            return;
        }

        // Calculate Total
        const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

        // 1. Create Order
        const orderRef = db.collection("orders").doc();
        currentOrderId = orderRef.id;

        const orderData = {
            orderId: currentOrderId,
            userId: currentUser.uid,
            items: cart,
            totalAmount: total,
            status: "PENDING",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await orderRef.set(orderData);

            // 2. Open Payment Modal
            const cartModalEl = document.getElementById('cartModal');
            const cartModal = bootstrap.Modal.getInstance(cartModalEl);
            cartModal.hide();

            paymentModal = new bootstrap.Modal(paymentModalEl);
            paymentModal.show();

            // UI Init
            document.getElementById('payment-loading').style.display = 'block';
            document.getElementById('payment-qr-container').style.display = 'none';
            paymentAmount.innerText = `₹${total.toFixed(2)}`;
            paymentTimerRef.innerText = "";

            // 3. Simulate Loading then Show QR
            setTimeout(() => {
                document.getElementById('payment-loading').style.display = 'none';
                document.getElementById('payment-qr-container').style.display = 'block';

                // --- DYNAMIC QR GENERATION ---
                // UPI URL Format: upi://pay?pa={UPI_ID}&pn={NAME}&am={AMOUNT}&cu=INR
                const upiId = "maheshdevi407-2@oksbi";
                const payeeName = "Mahesh Kumar";
                const amount = total.toFixed(2);

                const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR`;
                console.log("Generated UPI URL:", upiUrl);

                // Use a QR Code API to generate the image
                const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

                document.getElementById('payment-qr-image').src = qrApiUrl;
                // -----------------------------

                startPaymentListener(currentOrderId);
                startTimeoutTimer();
            }, 1000);

        } catch (e) {
            console.error("Order creation failed", e);
            alert("Could not initialize payment. Try again.");
        }
    });

    // Handle Manual Close
    const cancelBtn = document.getElementById('cancel-payment-btn');
    cancelBtn.addEventListener('click', () => {
        cleanupPayment();
    });
}

function startPaymentListener(orderId) {
    const orderRef = db.collection("orders").doc(orderId);

    const unsubscribe = orderRef.onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data();

        if (data.status === "SUCCESS") {
            handlePaymentSuccess();
            unsubscribe();
        }
    });

    // Store unsubscribe if we want to cancel specifically? 
    // Usually onSnapshot returns a function to unsubscribe.
}

function handlePaymentSuccess() {
    cleanupPayment();
    paymentModal.hide();

    // Clear Cart in Firestore
    const batch = db.batch();
    cart.forEach(item => {
        const ref = db.collection('users').doc(currentUser.uid).collection('cartItems').doc(item.id);
        batch.delete(ref);
    });
    batch.commit().then(() => {
        // Show Success Modal
        new bootstrap.Modal(document.getElementById('successModal')).show();
    });
}

function startTimeoutTimer() {
    let timeLeft = 120; // 2 minutes in seconds

    countDownInterval = setInterval(() => {
        timeLeft--;
        const min = Math.floor(timeLeft / 60);
        const sec = timeLeft % 60;
        paymentTimerRef.innerText = `Time remaining: ${min}:${sec < 10 ? '0' : ''}${sec}`;

        if (timeLeft <= 0) {
            handlePaymentTimeout();
        }
    }, 1000);
}

function handlePaymentTimeout() {
    cleanupPayment();
    paymentModal.hide();
    alert("Payment Timeout! Transaction cancelled.");
}

function cleanupPayment() {
    if (countDownInterval) clearInterval(countDownInterval);
    // Reset UI
    paymentTimerRef.innerText = "";
    currentOrderId = null;
}

// SIMULATE SUCCESS BUTTON (Demo Only)
const simSuccessBtn = document.getElementById('simulate-success-btn');
if (simSuccessBtn) {
    simSuccessBtn.addEventListener('click', () => {
        if (currentOrderId) {
            db.collection('orders').doc(currentOrderId).update({
                status: "SUCCESS"
            });
        }
    });
}
