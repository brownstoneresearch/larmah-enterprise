// Real API Integration for Exchange Rates
class ExchangeAPI {
    constructor() {
        this.supabaseUrl = 'YOUR_SUPABASE_URL';
        this.supabaseKey = 'YOUR_SUPABASE_KEY';
        this.cryptoAPIs = {
            binance: 'https://api.binance.com/api/v3/ticker/price',
            bybit: 'https://api.bybit.com/v2/public/tickers'
        };
    }

    async getForexRates() {
        // Fallback to Supabase if external API fails
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await response.json();
            return {
                USD: data.rates.NGN || 1450,
                GBP: (data.rates.NGN / data.rates.GBP) || 1820,
                EUR: (data.rates.NGN / data.rates.EUR) || 1580
            };
        } catch (error) {
            return this.getCachedRates();
        }
    }

    async getCryptoRates() {
        try {
            const response = await fetch(this.cryptoAPIs.binance);
            const data = await response.json();
            
            const rates = {};
            data.forEach(ticker => {
                if (ticker.symbol === 'BTCUSDT') rates.BTC = parseFloat(ticker.price);
                if (ticker.symbol === 'ETHUSDT') rates.ETH = parseFloat(ticker.price);
            });
            
            // Convert to Naira using USD rate
            const usdRate = await this.getUSDPrice();
            return {
                BTC: rates.BTC * usdRate,
                ETH: rates.ETH * usdRate,
                USDT: usdRate
            };
        } catch (error) {
            console.error('Crypto API error:', error);
            return this.getCachedRates('crypto');
        }
    }

    async saveExchangeRequest(data) {
        const request = {
            name: data.name,
            phone: data.phone,
            from_currency: data.from,
            to_currency: data.to,
            amount: data.amount,
            notes: data.notes,
            status: 'pending'
        };

        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/exchange_requests`, {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(request)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Save request error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateRates(newRates) {
        for (const [currency, rate] of Object.entries(newRates)) {
            await fetch(`${this.supabaseUrl}/rest/v1/exchange_rates?currency=eq.${currency}`, {
                method: 'PATCH',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    buy_rate: rate.buy,
                    sell_rate: rate.sell,
                    updated_at: new Date().toISOString()
                })
            });
        }
    }
}
