import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteProfile, renameProfile } from '../api/client';
import { StorageContext } from '../contexts/StorageContext';

const SettingsPage = () => {
    const { profile } = useContext(StorageContext);
    const navigate = useNavigate();
    const [name, setName] = useState(profile?.username ?? '');

    useEffect(() => {
        if (profile) {
            setName(profile.username);
        }
    }, [profile]);

    function handleDeleteProfile() {
        if (!profile) {
            return;
        }

        if (!window.confirm('Are you sure you want to delete your profile?')) {
            return;
        }

        deleteProfile(profile.id)
            .then(() => {
                localStorage.removeItem('profileID');
                navigate('/');
            })
            .catch((err) => {
                console.error(err);
                alert('Failed to delete profile');
            });
    }

    function handleRenameProfile() {
        if (!profile) {
            return;
        }

        renameProfile(profile.id, name)
            // Reload the page to fetch the updated profile
            .then(() => window.location.reload())
            .catch((err) => {
                console.error(err);
                alert('Failed to rename profile');
            });
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Settings</h1>
            <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Profile</h2>
                {!profile ? (
                    <p>Loading profile...</p>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-4">
                            <div className="flex items-center">
                                <p>Rename: </p>
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="px-2"
                            />
                            <button
                                className="bg-blue-500"
                                onClick={handleRenameProfile}
                            >
                                Save
                            </button>
                        </div>
                        <div>
                            <button
                                className="bg-red-500"
                                onClick={handleDeleteProfile}
                            >
                                Delete Profile
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
