import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function AttendanceBreakdown({ calculation: c, date }: { calculation: any; date: string }) {
  if (!c) return null;
  const duration = (hours: number) => `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;
  return <View style={{ marginTop: 12, gap: 8 }}>
    <Text style={{ fontWeight: '700', color: '#1D4F6D' }}>Shift: {c.approvedShift ? `${c.approvedShift.startTime} – ${c.approvedShift.endTime}` : 'Not assigned'}</Text>
    <Text style={{ color: '#475467' }}>{c.status.replace(/_/g, ' ')} · {c.lateStatus.replace(/_/g, ' ')} · {c.currentState.replace(/_/g, ' ')}</Text>
    <Text>Inside: {duration(c.totalInsideHours)} · Outside gaps: {duration(c.totalOutsideHours)}</Text>
    <Text>Counted: {duration(c.totalCountedHours)} · Elapsed: {duration(c.totalElapsedHours)}</Text>
    <Text>Sessions: {c.totalSessions} · Check-outs: {c.totalCheckOuts}</Text>
    {c.sessions?.map((s: any) => <View key={s.id} style={{ borderTopWidth: 1, borderColor: '#E5E7EB', paddingTop: 8, gap: 4 }}>
      <Text>In: {new Date(s.effectiveCheckIn).toLocaleString()}</Text>
      <Text>Out: {s.effectiveCheckOut ? new Date(s.effectiveCheckOut).toLocaleString() : 'Open session'}</Text>
      <Text>Inside: {duration(s.insideSeconds / 3600)}</Text>
      {(s.effectiveCheckIn !== s.checkInTime || s.effectiveCheckOut !== s.checkOutTime) && <Text style={{ color: '#B54708' }}>Admin-approved correction · Original in: {new Date(s.checkInTime).toLocaleString()} · Original out: {s.checkOutTime ? new Date(s.checkOutTime).toLocaleString() : 'Open'}</Text>}
      <TouchableOpacity onPress={() => router.push({ pathname: '/screens/worker/adjust-time', params: { date, sessionId: s.id, checkIn: s.checkInTime, checkOut: s.checkOutTime || '' } })}>
        <Text style={{ color: '#1D4F6D', fontWeight: '600' }}>Request correction for this session</Text>
      </TouchableOpacity>
    </View>)}
    {c.timeline?.filter((e: any) => e.activity === 'check_in' && e.durationSeconds > 0).map((e: any) => <Text key={e.sessionId} style={{ color: '#667085' }}>Outside gap before {new Date(e.time).toLocaleTimeString()}: {duration(e.durationSeconds / 3600)}</Text>)}
  </View>;
}
