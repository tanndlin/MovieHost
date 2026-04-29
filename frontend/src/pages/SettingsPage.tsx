import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageContext } from '../contexts/StorageContext';

const SettingsPage = () => {
    const { profile } = useContext(StorageContext);
    const navigate = useNavigate();

    function handleDeleteProfile() {
        if (window.confirm('Are you sure you want to delete your profile?')) {
            fetch(`/api/profile/${profile?.id}`, {
                method: 'DELETE'
            })
                .then((res) => {
                    if (res.ok) {
                        localStorage.removeItem('profileID');
                        navigate('/');
                    } else {
                        alert('Failed to delete profile');
                    }
                })
                .catch((err) => {
                    console.error(err);
                    alert('An error occurred while deleting the profile');
                });
        }
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Settings</h1>
            <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Profile</h2>
                {!profile ? (
                    <p>Loading profile...</p>
                ) : (
                    <button
                        className="bg-red-500"
                        onClick={handleDeleteProfile}
                    >
                        Delete Profile
                    </button>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
