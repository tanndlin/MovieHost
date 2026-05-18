import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import { StorageProvider } from './contexts/StorageContext';
import { WebsocketProvider } from './contexts/WebsocketContext';
import HomePage from './pages/HomePage';
import PlayerPage from './pages/PlayerPage';
import RemotePage from './pages/RemotePage';
import SettingsPage from './pages/SettingsPage';
import ShowPage from './pages/ShowPage/ShowPage';

function App() {
    return (
        <StorageProvider>
            <WebsocketProvider>
                <BrowserRouter>
                    <div className="flex flex-col min-h-screen">
                        <Header />
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/show/:name" element={<ShowPage />} />
                            <Route path="/player" element={<PlayerPage />} />
                            <Route
                                path="/settings"
                                element={<SettingsPage />}
                            />
                            <Route path="/remote" element={<RemotePage />} />
                        </Routes>
                    </div>
                </BrowserRouter>
            </WebsocketProvider>
        </StorageProvider>
    );
}

export default App;
