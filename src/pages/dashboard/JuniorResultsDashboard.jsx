import React, { useEffect, useState } from 'react';
import { Card, Input, Tabs, Spin } from 'antd';
import axios from 'axios';

const JuniorResultsDashboard = () => {
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(''); 
    const [activeClass, setActiveClass] = useState('JSS 1');

    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            try {
                const response = await axios.get('/api/students?class=JSS 1,JSS 2,JSS 3'); // Adjust API
                setStudents(response.data);
            } catch (error) {
                console.error('Error fetching students:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, []);

    useEffect(() => {
        const result = students.filter(student => 
            student.class === activeClass && 
            student.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredStudents(result);
    }, [students, activeClass, searchTerm]);

    const calculateAverage = (marks) => {
        const total = marks.reduce((acc, mark) => acc + mark, 0);
        return total / 15;
    };

    const performanceStatus = (average) => {
        if (average >= 75) return 'Excellent';
        if (average >= 50) return 'Good';
        if (average >= 35) return 'Pass';
        return 'Fail';
    };

    return (
        <div>
            <Input
                placeholder="Search Students"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Tabs defaultActiveKey="JSS 1" onChange={setActiveClass}>
                <Tabs.TabPane tab="JSS 1" key="JSS 1" />
                <Tabs.TabPane tab="JSS 2" key="JSS 2" />
                <Tabs.TabPane tab="JSS 3" key="JSS 3" />
            </Tabs>
            {loading ? <Spin /> : 
            filteredStudents.length > 0 ? (
                filteredStudents.map(student => {
                    const average = calculateAverage(student.marks);
                    return (
                        <Card key={student.id} style={{ marginBottom: '20px' }}>
                            <h3>{student.name} - {student.registrationNumber} ({student.class})</h3>
                            <p>Marks: {JSON.stringify(student.marks)}</p>
                            <Card style={{ backgroundColor: '#f0f1f2', padding: '10px', marginTop: '10px' }}>
                                <h4>Average: {average.toFixed(2)}% - {performanceStatus(average)}</h4>
                            </Card>
                        </Card>
                    );
                })
            ) : (
                <p>No students found.</p>
            )}
        </div>
    );
};

export default JuniorResultsDashboard;