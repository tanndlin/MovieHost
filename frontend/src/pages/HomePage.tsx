import { useState } from 'react';

const HomePage = () => {
    const [refreshRate, setRefreshRate] = useState(1000);

    // Send request to /api/hello to test server connection
    fetch('/api/ls')
        .then((response) => response.text())
        .then((data) => console.log(data))
        .catch((error) => console.error('Error fetching /api/hello:', error));

    return (
        <main className="p-4">
            <header className="flex gap-2 mb-4">
                <h1>Refresh Rate</h1>
                <select
                    name="refreshRate"
                    id="refreshRateSelect"
                    className="px-4 rounded-md bg-primary"
                    value={refreshRate}
                    onChange={(e) => setRefreshRate(Number(e.target.value))}
                >
                    <option value="1000">1 Hz</option>
                    <option value="500">2 Hz</option>
                    <option value="200">5 Hz</option>
                    <option value="100">10 Hz</option>
                </select>
            </header>
            <div className="grid grid-cols-2 gap-8 w-max"></div>
        </main>
    );
};

export default HomePage;
