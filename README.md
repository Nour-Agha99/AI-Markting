# 🛒 Smart Supermarket

A lightweight supermarket management system built with React, helping small shop owners record sales, manage inventory, and track customer debts — with a fully Arabic user interface.

🔗 **Live Demo:** [nour-agha99.github.io/AI-Markting](https://nour-agha99.github.io/AI-Markting/)

---

## 📋 Overview

This is a web application for managing a small supermarket or retail shop, offering three core functions: recording sales, managing products and inventory, and tracking customer debts. The app uses [n8n](https://n8n.io) as its backend via webhooks instead of a custom-built server, making it a lightweight and quick-to-deploy solution.

---

## ✨ Features

- 🛍️ **Sales recording** — add items to cart, automatic total calculation, support for per-kg or per-unit pricing
- 📦 **Product management** — add, edit, and delete products with low-stock alerts
- 💳 **Multiple payment methods** — cash, Bank of Palestine, PalPay, JawwalPay
- 📒 **Debt tracking** — record customer debts and log repayments
- 🌐 **Fully Arabic RTL interface** tailored for the local market

---

## 🧰 Tech Stack

| Category | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Icons | lucide-react |
| Styling | CSS Variables (custom theme) |
| Backend | n8n (Webhook-based automation) |
| Linting | oxlint |
| Deployment | GitHub Pages (`gh-pages`) |

---

## 📁 Project Structure

```
AI-Markting/
├── public/                # Static assets
├── src/
│   ├── assets/             # Images
│   ├── components/
│   │   └── TabBar.jsx      # Navigation tab bar
│   ├── pages/
│   │   ├── SalePage.jsx     # Sales page
│   │   ├── ProductsPage.jsx # Products page
│   │   └── DebtsPage.jsx    # Debts page
│   ├── services/
│   │   ├── config.js        # n8n endpoint URLs
│   │   └── dataService.js   # API call functions
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   └── theme.css
├── package.json
└── vite.config.js
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18 or newer)
- npm

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/Nour-Agha99/AI-Markting.git
cd AI-Markting

# 2. Install dependencies
npm install

# 3. Run the dev server
npm run dev
```

The app will run on: `http://localhost:5173`

### ⚠️ Important Backend Note

This app relies on external n8n workflows to handle data (products, sales, debts). To run the app with full functionality, you need to set up your own n8n instance and point the endpoints in `src/services/config.js` to your own webhook URLs.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint the code |
| `npm run deploy` | Deploy to GitHub Pages |

---

## 🗺️ Roadmap

- [ ] 🤖 Integrate real AI features (sales forecasting, reorder quantity suggestions, customer behavior analysis)
- [ ] 🔐 User authentication & role-based access
- [ ] 🧪 Add unit & integration tests
- [ ] 🗄️ Optional migration from n8n to a dedicated backend/database for more control
- [ ] 📊 Analytics dashboard for sales reports and statistics
- [ ] 📱 PWA version for offline support

---

## 🤝 Contributing

Contributions are welcome! For any suggestion or fix, please open an Issue or Pull Request.

---

#Nour
---
