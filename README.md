# Zomato Food Expense Calculator 🍕💰

A powerful Chrome Extension that helps you track and visualize your lifetime spending on Zomato. It fetches your order history securely and presents it in a beautiful, interactive dashboard.

## 🌟 Features

-   **📈 Interactive Dashboard**: A full-screen analytics dashboard.
-   **💰 Total Spending Analysis**: View your total lifetime spend, total orders, and average order value.
-   **📅 Smart Filters**: Analyze spending by:
    -   Last 30 Days
    -   Last 3 Months
    -   Last 1 Year
    -   Custom Date Range
-   **📊 Visual Charts**:
    -   **Monthly Spending**: See how your food expenses trend over time.
    -   **Order Time Heatmap**: Discover what time of day you order the most (e.g., Late Night vs. Lunch).
-   **🏆 Top Restaurants**: A ranked list of your most expensive and most frequented restaurants.
-   **🔒 Privacy First**: All data is fetched directly from Zomato to your browser and stored consistently in **Chrome Local Storage**. No data is ever sent to third-party servers.

## 🛠 Technical Details

-   **Platform**: Chrome Extension (Manifest V3).
-   **Data Source**: Uses Zomato's internal web API (`/webroutes/user/orders`) to fetch authenticated user data using your active browser session cookies.
-   **Frontend**: HTML5, Vanilla CSS (Zomato-themed), and JavaScript.
-   **Visualization**: Uses [Chart.js](https://www.chartjs.org/) for rendering responsive graphs.
-   **Storage**: `chrome.storage.local` for caching order history.

## 📂 File Structure

-   `manifest.json`: Extension configuration and permissions.
-   `dashboard.html`: The main analytics interface.
-   `styles/dashboard.css`: Styling matching Zomato's red/white aesthetic.
-   `scripts/dashboard.js`: Core logic. Handles:
    -   Fetching data from Zomato with pagination.
    -   Parsing singular (`ORDER`) vs plural (`ORDERS`) JSON responses.
    -   Cleaning and parsing non-standard date formats (e.g., "June 01, 2024 at 09:22 PM").
    -   Aggregating data for charts.
-   `lib/chart.js`: Local copy of the Chart.js library.

## 🚀 How to Install & Use

1.  **Open Chrome Extensions**: Go to `chrome://extensions`.
2.  **Enable Developer Mode**: Toggle the switch in the top-right corner.
3.  **Load Unpacked**:
    -   Click the button and select the `zomato-expense-calculator` folder.
4.  **Login to Zomato**: Ensure you are logged into [zomato.com](https://www.zomato.com) in your browser.
5.  **Launch**:
    -   Click the extension icon in your toolbar.
    -   Click **"View Dashboard"**.
6.  **Sync**: Click **"Sync Data"** on the dashboard to start fetching your history.

---

*Note: This is a fan-made project and is not officially affiliated with Zomato.*
