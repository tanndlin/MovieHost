import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import { StorageProvider } from './contexts/StorageContext';
import HomePage from './pages/HomePage';
import PlayerPage from './pages/PlayerPage';
import SettingsPage from './pages/SettingsPage';
import ShowPage from './pages/ShowPage';

function App() {
    return (
        <StorageProvider>
            <BrowserRouter>
                <div className="min-h-screen">
                    <Header />
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/show/:name" element={<ShowPage />} />
                        <Route path="/player" element={<PlayerPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                </div>
            </BrowserRouter>
        </StorageProvider>
    );
}

export default App;
