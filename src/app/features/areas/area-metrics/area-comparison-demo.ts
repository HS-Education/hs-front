import type { Classroom } from '../../classrooms/data-access/models/responses/classroom.model';
import type { AreaPerformanceResource, TopicPerformance } from '../../classrooms/classroom-detail/progress/services/achievement.service';

// UI-only fixtures. Negative IDs prevent accidental overlap with real resources.
// These records are never submitted to a service or merged with the real area data.
const teachers = [
  { name: 'Ana Torres', section: 'A', students: 18, average: 18.1, courseIds: [-101, -102] },
  { name: 'Carlos Mendoza', section: 'B', students: 24, average: 16.4, courseIds: [-101, -103] },
  { name: 'Lucía Ramos', section: 'C', students: 20, average: 14.6, courseIds: [-102, -104] },
  { name: 'Diego Salazar', section: 'D', students: 22, average: 17.3, courseIds: [-101, -102, -103] },
  { name: 'Mariana Vega', section: 'E', students: 16, average: 15.7, courseIds: [-103, -104] },
  { name: 'Javier Ríos', section: 'F', students: 21, average: 18.6, courseIds: [-101, -104] },
];
const courses = [
  { id: -101, name: 'RAZONAMIENTO MATEMÁTICO', offset: 0.45 },
  { id: -102, name: 'ÁLGEBRA', offset: 0.15 },
  { id: -103, name: 'GEOMETRÍA', offset: -0.15 },
  { id: -104, name: 'TRIGONOMETRÍA', offset: -0.45 },
];

export const COMPARISON_DEMO_CLASSROOMS: Classroom[] = teachers.flatMap((teacher, teacherIndex) =>
  courses.filter(course => teacher.courseIds.includes(course.id)).map((course, courseIndex) => ({
    id: -(teacherIndex * courses.length + courseIndex + 1),
    courseId: course.id,
    courseName: course.name,
    areaName: 'MATEMÁTICA',
    teacherName: teacher.name,
    section: { id: -(teacherIndex + 1), name: teacher.section, educationLevel: 'SECONDARY', gradeLevel: 'SECOND' },
    academicYearId: -1,
    academicYearName: 2026,
    academicYearStatus: 'ACTIVE',
    status: 'ACTIVE',
  })));

export const COMPARISON_DEMO_PERFORMANCE: AreaPerformanceResource = {
  areaId: -1,
  areaName: 'MATEMÁTICA',
  averageScore: 0,
  classrooms: COMPARISON_DEMO_CLASSROOMS.map(room => {
    const teacherIndex = teachers.findIndex(teacher => teacher.name === room.teacherName);
    const teacher = teachers[teacherIndex];
    const course = courses.find(course => course.id === room.courseId)!;
    const students = Array.from({ length: teacher.students }, (_, studentIndex) => {
      // Same section/cohort across the assigned courses; three students have no marks yet.
      const topics: TopicPerformance[] = studentIndex < teacher.students - 3
        ? Array.from({ length: 8 }, (_, index) => {
          const period = Math.floor(index / 2) + 1;
          const variation = ((studentIndex * 7) % 11 - 5) * 0.55;
          const score = Math.round(Math.max(0, Math.min(20,
            teacher.average + course.offset + variation + (period - 2.5) * 0.2 + (index % 2 ? 0.2 : -0.2))) * 10) / 10;
          return {
            topicId: course.id * 100 - index,
            topicName: `${course.name} · Tema ${index + 1}`,
            weekNumber: index % 2 + 1,
            score,
            percentage: score * 5,
            gradingPeriodId: -period,
            courseId: course.id,
          };
        }) : [];
      return {
        studentId: -(teacherIndex * 100 + studentIndex + 1),
        studentName: `Estudiante de ejemplo ${teacher.section}${studentIndex + 1}`,
        topics,
        averageScore: topics.length ? topics.reduce((sum, topic) => sum + topic.percentage, 0) / topics.length : 0,
      };
    });
    const evaluated = students.filter(student => student.topics.length);
    return {
      classroomId: room.id,
      classroomName: `${room.courseName} · Segundo ${room.section.name}`,
      students,
      averageScore: evaluated.reduce((sum, student) => sum + student.averageScore, 0) / evaluated.length,
    };
  }),
};
COMPARISON_DEMO_PERFORMANCE.averageScore = COMPARISON_DEMO_PERFORMANCE.classrooms
  .reduce((sum, room) => sum + room.averageScore, 0) / COMPARISON_DEMO_PERFORMANCE.classrooms.length;
