import { expect,test } from 'vitest'
import { serviceLoadState } from '../shared/serviceLoadState'
test('a failed live service query becomes an unavailable state without seeded bookable options',()=>{const error=new Error('[CONVEX Q(services:listPublic)] Server Error');const state=serviceLoadState(error);expect(state.loading).toBe(false);expect(state.services).toEqual([]);expect(state.error).toContain('temporarily unavailable');expect(state.error).not.toContain('CONVEX')})
test('services can recover from an error to a legitimate empty catalogue',()=>{const failed=serviceLoadState(new Error('missing backend'));const recovered=serviceLoadState({services:[],extras:[]});expect(failed.error).not.toBeNull();expect(recovered).toEqual({services:[],extras:[],loading:false,error:null})})
test('initial loading is distinct from a server failure',()=>{expect(serviceLoadState(undefined)).toEqual({services:[],extras:[],loading:true,error:null})})
