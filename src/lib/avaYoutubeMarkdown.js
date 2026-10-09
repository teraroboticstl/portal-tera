import {youtubeId} from './avaRules.js';

// Turn pasted YouTube URLs into links in the Markdown tree, keeping code and
// existing links untouched. The module renderer displays these links as players.
export function remarkYoutubeLinks() {
  return function transform(tree) {
    function visit(parent) {
      if(!parent.children || ['link','linkReference','code','inlineCode'].includes(parent.type))return;
      parent.children=parent.children.flatMap(node=>{
        if(node.type!=='text'){visit(node);return [node];}
        const result=[];
        let cursor=0;
        for(const match of node.value.matchAll(/https:\/\/[^\s<>]+/g)) {
          const url=match[0].replace(/[.,;!?)\]]+$/,'');
          if(!youtubeId(url))continue;
          if(match.index>cursor)result.push({type:'text',value:node.value.slice(cursor,match.index)});
          result.push({type:'link',url,children:[{type:'text',value:url}]});
          cursor=match.index+url.length;
        }
        if(!result.length)return [node];
        if(cursor<node.value.length)result.push({type:'text',value:node.value.slice(cursor)});
        return result;
      });
    }
    visit(tree);
  };
}
