import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import PlayerPage from './pages/PlayerPage';
import ShowPage from './pages/ShowPage';

function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen">
                <Header />
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/show/:name" element={<ShowPage />} />
                    <Route path="/player" element={<PlayerPage />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;
