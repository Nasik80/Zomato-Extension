const ZOMATO_ORDER_URL = "https://www.zomato.com/webroutes/user/orders";

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();

    document.getElementById('syncButton').addEventListener('click', startSync);

    // Filters
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            applyFilter(e.target.dataset.range);
        });
    });

    document.getElementById('applyRange').addEventListener('click', () => {
        const start = document.getElementById('startDate').value;
        const end = document.getElementById('endDate').value;
        if (start && end) {
            applyCustomFilter(new Date(start), new Date(end));
        }
    });
});

let charts = {};
let allOrdersData = [];

async function initializeDashboard() {
    const data = await chrome.storage.local.get(['zomatoOrders', 'lastUpdated']);
    if (data.zomatoOrders && data.zomatoOrders.length > 0) {
        allOrdersData = data.zomatoOrders;
        document.getElementById('lastUpdated').textContent = `Last updated: ${new Date(data.lastUpdated).toLocaleString()}`;
        updateDashboard(allOrdersData);
    } else {
        // Prompt user to sync
        console.log("No data found, please sync.");
    }
}

async function startSync() {
    const overlay = document.getElementById('loadingOverlay');
    const progressFill = document.getElementById('progressFill');
    const loadingStatus = document.getElementById('loadingStatus');

    overlay.classList.remove('hidden');
    progressFill.style.width = '5%';
    loadingStatus.textContent = "Connecting to Zomato...";

    let allOrders = [];
    let page = 1;
    let hasMore = true;
    let failed = false;

    // Check if user is logged in by making a probe request
    try {
        const probe = await fetch(ZOMATO_ORDER_URL + "?page=1");
        if (!probe.ok) { // 403 or 404
            if (probe.status === 403 || probe.url.includes('login')) {
                alert("Please log in to Zomato in a separate tab first!");
                overlay.classList.add('hidden');
                return;
            }
        }
    } catch (e) {
        console.error("Probe failed", e);
        // It might still work if it's just CORS (but manifest handles CORS)
    }

    try {
        while (hasMore) {
            loadingStatus.textContent = `Fetching page ${page}...`;
            const response = await fetch(`${ZOMATO_ORDER_URL}?page=${page}`);

            if (!response.ok) throw new Error(`Status ${response.status}`);

            const json = await response.json();
            console.log("Zomato Response Page " + page, json); // Debug log

            let orders = [];

            // Attempt to find orders in different known places
            // CASE 1: keys like "5875615424" inside entities.ORDER
            if (json.entities && json.entities.ORDER) {
                // It's a map of id -> order
                orders = Object.values(json.entities.ORDER);
            }
            // CASE 2: keys like "5875615424" inside entities.ORDERS
            else if (json.entities && json.entities.ORDERS) {
                orders = Object.values(json.entities.ORDERS);
            }
            // CASE 3: Nested in sections
            else if (json.sections && json.sections.SECTION_USER_ORDER_HISTORY && json.sections.SECTION_USER_ORDER_HISTORY.entities) {
                orders = json.sections.SECTION_USER_ORDER_HISTORY.entities;
            }

            if (orders.length === 0) {
                console.warn("No orders found in response", json);
                // Only alert on first page failure
                if (page === 1) {
                    alert("Logged in, but found no orders. Check console for details.");
                }
                hasMore = false;
            } else {
                allOrders = [...allOrders, ...orders];
                // Update progress
                progressFill.style.width = `${Math.min(90, (page) * 5)}%`; // slower progress bar

                // Pagination check
                // If we got orders, we assume there might be more unless we see a clear "totalPages" indicator
                // OR if the number of orders returned is suspiciously low (e.g. < 5), it might be the last page.

                if (json.sections && json.sections.SECTION_USER_ORDER_HISTORY) {
                    const totalPages = json.sections.SECTION_USER_ORDER_HISTORY.totalPages;
                    if (totalPages && page >= totalPages) hasMore = false;
                } else {
                    // Fallback: if we got very few orders, assume end
                    if (orders.length < 5) hasMore = false;
                }
            }

            page++;
            await new Promise(r => setTimeout(r, 1000)); // Rate limit 1s
        }
    } catch (err) {
        console.error(err);
        failed = true;
        alert("Error fetching data. Ensure you are logged into Zomato. " + err.message);
    }

    overlay.classList.add('hidden');

    if (!failed && allOrders.length > 0) {
        allOrdersData = allOrders;
        chrome.storage.local.set({
            zomatoOrders: allOrders,
            lastUpdated: new Date().toISOString()
        });
        document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleString()}`;
        updateDashboard(allOrdersData);
        alert(`Successfully synced ${allOrders.length} orders!`);
    } else if (!failed && allOrders.length === 0) {
        alert("No orders found or user not logged in.");
    }
}

function parseOrderCost(costStr) {
    if (typeof costStr === 'number') return costStr;
    if (!costStr) return 0;
    // Remove symbols and commas. "₹1,203.00" -> 1203.00
    return parseFloat(costStr.toString().replace(/[^0-9.]/g, ''));
}

function parseOrderDate(dateStr) {
    if (!dateStr) return new Date(0); // Return epoch if missing
    // Zomato dates: "June 01, 2024 at 09:22 PM"
    // Remove " at " to make it standard "June 01, 2024 09:22 PM" which Date() understands better
    const cleanedDate = dateStr.replace(' at ', ' ');
    const date = new Date(cleanedDate);

    // Check if invalid
    if (isNaN(date.getTime())) {
        console.warn("Failed to parse date:", dateStr);
        return new Date(0);
    }

    return date;
}

function applyFilter(range) {
    const now = new Date();
    let cutoff = new Date(0); // Epoch

    if (range === '1y') {
        cutoff.setFullYear(now.getFullYear() - 1);
    } else if (range === '3m') {
        cutoff.setMonth(now.getMonth() - 3);
    } else if (range === '30d') {
        cutoff.setDate(now.getDate() - 30);
    }

    const filtered = allOrdersData.filter(o => parseOrderDate(o.orderDate) >= cutoff);
    updateDashboard(filtered);
}

function applyCustomFilter(start, end) {
    const filtered = allOrdersData.filter(o => {
        const d = parseOrderDate(o.orderDate);
        return d >= start && d <= end;
    });
    updateDashboard(filtered);
}

function updateDashboard(orders) {
    // 1. Stats
    let totalSpent = 0;
    let totalOrders = orders.length;

    orders.forEach(o => {
        totalSpent += parseOrderCost(o.totalCost);
    });

    let avgVal = totalOrders > 0 ? totalSpent / totalOrders : 0;

    document.getElementById('totalSpent').textContent = "₹" + Math.round(totalSpent).toLocaleString();
    document.getElementById('totalOrders').textContent = totalOrders;
    document.getElementById('avgOrderValue').textContent = "₹" + Math.round(avgVal);

    // 2. Charts Data Prep
    const months = {};
    const hours = new Array(24).fill(0);
    const restaurants = {};
    const days = {};

    orders.forEach(o => {
        const date = parseOrderDate(o.orderDate);
        const cost = parseOrderCost(o.totalCost);
        const resName = o.resInfo ? o.resInfo.name : "Unknown Restaurant";

        // Monthly
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months[monthKey] = (months[monthKey] || 0) + cost;

        // Hourly
        hours[date.getHours()]++;

        // Restaurant
        if (!restaurants[resName]) restaurants[resName] = { count: 0, spent: 0 };
        restaurants[resName].count++;
        restaurants[resName].spent += cost;
    });

    // 3. Render Charts
    renderMonthlyChart(months);
    renderTimeChart(hours);
    renderTopRestaurants(restaurants);
    renderRecentOrders(orders);
}

function renderMonthlyChart(dataObj) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    const sortedKeys = Object.keys(dataObj).sort();
    const values = sortedKeys.map(k => dataObj[k]);

    if (charts.monthly) charts.monthly.destroy();

    charts.monthly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedKeys,
            datasets: [{
                label: 'Monthly Spending (₹)',
                data: values,
                backgroundColor: '#cb202d',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderTimeChart(hoursArray) {
    const ctx = document.getElementById('timeChart').getContext('2d');

    if (charts.time) charts.time.destroy();

    charts.time = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hoursArray.map((_, i) => `${i}:00`),
            datasets: [{
                label: 'Orders per Hour',
                data: hoursArray,
                borderColor: '#cb202d',
                backgroundColor: 'rgba(203, 32, 45, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderTopRestaurants(resObj) {
    const list = document.getElementById('topRestaurantsList');
    list.innerHTML = '';

    const sorted = Object.entries(resObj)
        .sort(([, a], [, b]) => b.spent - a.spent)
        .slice(0, 10);

    sorted.forEach(([name, data], index) => {
        const li = document.createElement('li');
        li.className = 'ranking-item';
        li.innerHTML = `
            <span class="rank">#${index + 1}</span>
            <span class="name">${name}</span>
            <div style="text-align:right">
                <div class="value">₹${Math.round(data.spent).toLocaleString()}</div>
                <div style="font-size:0.8em; color:#666">${data.count} orders</div>
            </div>
        `;
        list.appendChild(li);
    });
}

function renderRecentOrders(orders) {
    const list = document.getElementById('recentOrdersList');
    list.innerHTML = '';

    // Sort by date desc
    const sorted = [...orders].sort((a, b) => parseOrderDate(b.orderDate) - parseOrderDate(a.orderDate)).slice(0, 10);

    sorted.forEach(o => {
        const date = parseOrderDate(o.orderDate);
        const li = document.createElement('li');
        li.className = 'ranking-item';
        li.innerHTML = `
            <span class="name">${o.resInfo ? o.resInfo.name : 'Unknown'}</span>
            <div style="text-align:right">
                <div class="value">₹${parseOrderCost(o.totalCost)}</div>
                <div style="font-size:0.8em; color:#666">${date.toLocaleDateString()}</div>
            </div>
        `;
        list.appendChild(li);
    });
}
