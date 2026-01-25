import { useState } from 'react';
import { LogicToEnglish } from './LogicToEnglish';
import { EnglishToLogic } from './EnglishToLogic';
import './App.css';

type Tab = 'logic-to-english' | 'english-to-logic';

export default function App() {
  const [tab, setTab] = useState<Tab>('logic-to-english');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Logic ↔ English</h1>
        <nav className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'logic-to-english'}
            className={tab === 'logic-to-english' ? 'active' : ''}
            onClick={() => setTab('logic-to-english')}
          >
            Logic → English
          </button>
          <button
            role="tab"
            aria-selected={tab === 'english-to-logic'}
            className={tab === 'english-to-logic' ? 'active' : ''}
            onClick={() => setTab('english-to-logic')}
          >
            English → Logic
          </button>
        </nav>
      </header>
      <main className="app-main">
        {tab === 'logic-to-english' && <LogicToEnglish />}
        {tab === 'english-to-logic' && <EnglishToLogic />}
      </main>
    </div>
  );
}
