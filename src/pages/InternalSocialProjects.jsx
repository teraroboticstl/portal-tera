import React from 'react';
import {Navigate,useLocation} from 'react-router-dom';
export default function InternalSocialProjects(){
 const {search}=useLocation();
 return <Navigate replace to={'/InternalProjects'+search} />;
}
