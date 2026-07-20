"use client";

import { useState } from "react";
import { 
  Leaf, 
  Flame, 
  Utensils, 
  MapPin, 
  Activity,
  Send,
  Loader2
} from "lucide-react";
import mockData from "../data/mock.json";

export default function Dashboard() {
  const [input, setInput] = useState("50kg leftover rice, 20kg expired sour milk, 30kg fresh apples, 10kg pork bones");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const analyzeFood = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodInput: input, mockData }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze");
      
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Oasis AI: Food Sustainability</h1>
        <p className="subtitle">Intelligent surplus food distribution for Dubai AI Week</p>
      </header>

      <div className="grid-2">
        {/* Input Section */}
        <section className="glass-panel">
          <h2><Leaf className="inline-block mr-2 text-primary" size={24} /> Input Surplus Food</h2>
          <div className="input-group">
            <label htmlFor="food-input">List today's surplus items and quantities:</label>
            <textarea 
              id="food-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., 50kg rice, 10kg spoiled tomatoes..."
            />
          </div>
          <button 
            onClick={analyzeFood} 
            disabled={loading || !input}
          >
            {loading ? <Loader2 className="spinner" size={20} /> : <Send size={20} />}
            {loading ? "Analyzing via Gemini AI..." : "Analyze & Distribute"}
          </button>
          {error && <p style={{ color: '#EF4444', marginTop: '1rem' }}>{error}</p>}
        </section>

        {/* Overview Stats Section */}
        {result && (
          <section className="glass-panel">
            <h2><Activity className="inline-block mr-2 text-primary" size={24} /> Impact Overview</h2>
            <div className="grid-2" style={{ gap: '1rem', marginTop: '1.5rem' }}>
              <div className="stat-card">
                <span className="stat-value text-primary">{result.summary.totalCalories.toLocaleString()}</span>
                <span className="stat-label">Total Calories Saved</span>
              </div>
              <div className="stat-card">
                <span className="stat-value edible">{result.summary.edibleItems}</span>
                <span className="stat-label">Edible Batches</span>
              </div>
              <div className="stat-card">
                <span className="stat-value inedible">{result.summary.inedibleItems}</span>
                <span className="stat-label">Inedible (Energy/Feed)</span>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Smart Distribution Plan</h2>
          
          <div className="grid-2">
            {/* Edible List */}
            <div className="glass-panel">
              <h3 style={{ marginBottom: '1rem', color: 'var(--accent-edible)' }}>
                <Utensils className="inline-block mr-2" size={20} />
                Human Consumption (Shelters)
              </h3>
              <ul className="result-list">
                {result.edible.map((item, idx) => (
                  <li key={idx} className="result-item">
                    <div className="item-header">
                      <span className="item-title">{item.item}</span>
                      <span className="badge edible">EDIBLE</span>
                    </div>
                    <div className="item-details">
                      <span style={{ color: 'var(--text-main)' }}><strong>{item.calories} kcal</strong></span>
                      <span>Macros: P {item.macros.protein} | C {item.macros.carbs} | F {item.macros.fat}</span>
                      <span style={{ marginTop: '0.5rem', color: 'var(--primary)' }}>
                        <MapPin size={14} className="inline mr-1" />
                        Destination: {item.destination}
                      </span>
                      <span style={{ fontStyle: 'italic', marginTop: '0.25rem' }}>{item.reason}</span>
                    </div>
                  </li>
                ))}
                {result.edible.length === 0 && <p className="text-muted">No edible items identified.</p>}
              </ul>
            </div>

            {/* Inedible List */}
            <div className="glass-panel">
              <h3 style={{ marginBottom: '1rem', color: 'var(--accent-inedible)' }}>
                <Flame className="inline-block mr-2" size={20} />
                Energy & Agriculture
              </h3>
              <ul className="result-list">
                {result.inedible.map((item, idx) => (
                  <li key={idx} className="result-item">
                    <div className="item-header">
                      <span className="item-title">{item.item}</span>
                      <span className="badge inedible">INEDIBLE</span>
                    </div>
                    <div className="item-details">
                      <span style={{ color: 'var(--primary)' }}>
                        <MapPin size={14} className="inline mr-1" />
                        Destination: {item.destination}
                      </span>
                      <span style={{ fontStyle: 'italic', marginTop: '0.25rem' }}>{item.reason}</span>
                    </div>
                  </li>
                ))}
                {result.inedible.length === 0 && <p className="text-muted">No inedible items identified.</p>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
