import React, { useEffect } from 'react';
import { useNavigate } from '../services/skipService';

const WatchParty: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate('/', { replace: true });
    }, [navigate]);

    return null;
};

export default WatchParty;