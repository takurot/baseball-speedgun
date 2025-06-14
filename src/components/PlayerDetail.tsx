import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Record {
  id: string;
  date: Date;
  speed: number;
}

const PlayerDetail = () => {
  const { name } = useParams<{ name: string }>();
  const [records, setRecords] = useState<Record[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);
  
  useEffect(() => {
    if (!name || !currentUser) return;
    const q = query(collection(db, `users/${currentUser.uid}/players/${name}/records`), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (querySnapshot) => {
      const recordsData: Record[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        recordsData.push({
          id: doc.id,
          date: data.date.toDate(),
          speed: data.speed,
        });
      });
      setRecords(recordsData);
    });
    return () => unsub();
  }, [name, currentUser]);

  const handleDeleteRecord = async (recordId: string) => {
    if (!name || !currentUser || !window.confirm('この記録を削除しますか？')) return;

    try {
      const recordRef = doc(db, `users/${currentUser.uid}/players/${name}/records`, recordId);
      const playerRef = doc(db, `users/${currentUser.uid}/players`, name);

      const recordToDelete = records.find(r => r.id === recordId);
      if (!recordToDelete) return;
      
      await deleteDoc(recordRef);

      const playerDoc = await getDoc(playerRef);
      if (playerDoc.exists() && playerDoc.data().speed === recordToDelete.speed) {
        const remainingRecords = records.filter(r => r.id !== recordId);
        if (remainingRecords.length > 0) {
          const newMaxSpeed = Math.max(...remainingRecords.map(r => r.speed));
          await setDoc(playerRef, { speed: newMaxSpeed, updatedAt: new Date() }, { merge: true });
        } else {
          // 記録がなくなったら選手自体も削除
          await deleteDoc(playerRef);
          navigate('/ranking'); // ランキングページに戻る
        }
      }
    } catch (error) {
      console.error("記録の削除に失敗しました: ", error);
    }
  };

  const chartData = {
    labels: records.map(r => r.date.toLocaleDateString()),
    datasets: [
      {
        label: '球速 (km/h)',
        data: records.map(r => r.speed),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };
  
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${name}選手の球速推移`,
      },
    },
  };

  return (
    <div>
      <Link to="/ranking">← ランキングに戻る</Link>
      <h1>{name}選手 詳細</h1>
      {records.length > 0 ? (
        <>
          <Line options={options} data={chartData} />
          
          <h2>全投球記録</h2>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            {records.map((record) => (
              <div key={record.id} style={{ marginBottom: '10px' }}>
                <span>{record.date.toLocaleDateString()} - {record.speed} km/h</span>
                <button onClick={() => handleDeleteRecord(record.id)} style={{marginLeft: '10px'}}>削除</button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p>記録がありません。</p>
      )}
    </div>
  );
};

export default PlayerDetail; 