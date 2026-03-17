import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';

function App() {
    return (
        <div className="w-screen h-screen bg-primary">
            <Header />
            <div className="py-4">
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                    </Routes>
                </BrowserRouter>
            </div>
        </div>
    );
}

export default App;
