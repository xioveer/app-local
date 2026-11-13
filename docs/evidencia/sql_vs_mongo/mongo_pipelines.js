const fs = require('fs');
const path = require('path');
const { Aggregator } = require('mingo');
const { BSON } = require('bson');

const SP = __dirname;
const datos = JSON.parse(fs.readFileSync(path.join(SP, 'datos.json'), 'utf8'));

const colecciones = { disciplinas: datos.disciplinas, estudiantes: datos.estudiantes, asistencias: datos.asistencias };
const correr = (coleccion, pipeline) => new Aggregator(pipeline, { collectionResolver: (nombre) => colecciones[nombre] }).run(colecciones[coleccion]);

const HOY = '2026-10-12';

const q1 = [
  { $match: { activo: true } },
  { $lookup: { from: 'asistencias', localField: '_id', foreignField: 'estudiante_id', as: 'registros' } },
  { $addFields: { hoy: { $filter: { input: '$registros', as: 'r', cond: { $eq: ['$$r.fecha', HOY] } } } } },
  { $group: {
      _id: null,
      activos: { $sum: 1 },
      registrados: { $sum: { $size: '$hoy' } },
      presentes: { $sum: { $size: { $filter: { input: '$hoy', as: 'r', cond: '$$r.asistio' } } } },
  } },
  { $project: {
      _id: 0,
      presentes: 1,
      ausentes: { $subtract: ['$registrados', '$presentes'] },
      registrados: 1,
      sin_registrar: { $subtract: ['$activos', '$registrados'] },
      porcentaje: { $cond: [{ $gt: ['$registrados', 0] }, { $round: [{ $multiply: [100, { $divide: ['$presentes', '$registrados'] }] }, 1] }, null] },
  } },
];

const q2 = [
  { $match: { activo: true } },
  { $lookup: { from: 'disciplinas', localField: 'disciplina_id', foreignField: '_id', as: 'disciplina' } },
  { $unwind: '$disciplina' },
  { $lookup: { from: 'asistencias', localField: '_id', foreignField: 'estudiante_id', as: 'registros' } },
  { $addFields: { hoy: { $filter: { input: '$registros', as: 'r', cond: { $eq: ['$$r.fecha', HOY] } } } } },
  { $group: {
      _id: '$disciplina.nombre',
      estudiantes: { $sum: 1 },
      presentes: { $sum: { $size: { $filter: { input: '$hoy', as: 'r', cond: '$$r.asistio' } } } },
      sin_registrar: { $sum: { $cond: [{ $eq: [{ $size: '$hoy' }, 0] }, 1, 0] } },
  } },
  { $project: { _id: 0, disciplina: '$_id', estudiantes: 1, presentes: 1, sin_registrar: 1 } },
  { $sort: { disciplina: 1 } },
];

const q3 = [
  { $match: { activo: true } },
  { $group: { _id: '$estado_pago', estudiantes: { $sum: 1 } } },
  { $project: { _id: 0, estado_pago: '$_id', estudiantes: 1 } },
  { $sort: { estado_pago: 1 } },
];

const r1 = correr('estudiantes', q1)[0];
const r2 = correr('estudiantes', q2);
const r3 = correr('estudiantes', q3);
console.log('Q1 MongoDB:', JSON.stringify(r1));
console.log('Q2 MongoDB:', JSON.stringify(r2));
console.log('Q3 MongoDB:', JSON.stringify(r3));

const sql = { q1: { presentes: 7, ausentes: 2, registrados: 9, sin_registrar: 0, porcentaje: 77.8 },
  q2: [['Danza folclórica', 2, 1, 0], ['Fútbol', 4, 3, 0], ['Guitarra', 3, 3, 0]], q3: [['al_dia', 5], ['pendiente', 2], ['vencido', 2]] };
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const ok1 = Object.keys(sql.q1).every((k) => r1[k] === sql.q1[k]) && Object.keys(r1).length === Object.keys(sql.q1).length;
const ok2 = iguales(r2.map((x) => [x.disciplina, x.estudiantes, x.presentes, x.sin_registrar]), sql.q2);
const ok3 = iguales(r3.map((x) => [x.estado_pago, x.estudiantes]), sql.q3);
console.log(`\nIDÉNTICO a SQL → Q1: ${ok1} | Q2: ${ok2} | Q3: ${ok3}`);

const q1Vacio = JSON.parse(JSON.stringify(q1)); q1Vacio[2].$addFields.hoy.$filter.cond.$eq[1] = '2099-01-01';
console.log('Q1 sin registros (fecha sin datos):', JSON.stringify(correr('estudiantes', q1Vacio)[0]), '← porcentaje null: se evitó la división por cero');

const unaAsistencia = { fecha: '2026-10-12', asistio: true };
const bytes = (o) => BSON.calculateObjectSize(o);
const estudianteBase = { _id: 1, nombre_completo: 'Santiago Pérez Mora', edad: 9, disciplina: { id: 1, nombre: 'Fútbol' }, categoria: 'Infantil', acudiente_nombre: 'Marta Mora', acudiente_telefono: '300 000 0001', estado_pago: 'al_dia', activo: true };
const conAsistencias = (n) => ({ ...estudianteBase, asistencias: Array.from({ length: n }, (_, i) => ({ fecha: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10), asistio: i % 7 !== 0 })) });
const tam = {
  una_asistencia_bytes: bytes(unaAsistencia),
  estudiante_sin_asistencias_bytes: bytes(estudianteBase),
  un_anio_156_clases_kb: Math.round(bytes(conAsistencias(156)) / 102.4) / 10,
  cinco_anios_780_clases_kb: Math.round(bytes(conAsistencias(780)) / 102.4) / 10,
  limite_mongodb_mb: 16,
  anios_para_llegar_al_limite_a_156_clases_por_anio: Math.round(((16 * 1024 * 1024 - bytes(estudianteBase)) / bytes(unaAsistencia)) / 156),
};
console.log('\nTamaños BSON:', JSON.stringify(tam));
fs.writeFileSync(path.join(SP, 'resultado_mongo.json'), JSON.stringify({ r1, r2, r3, ok1, ok2, ok3, tam }, null, 2));
process.exit(ok1 && ok2 && ok3 ? 0 : 1);
