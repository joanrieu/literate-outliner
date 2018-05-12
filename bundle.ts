type Id = string
interface Item {
    id: Id,
    parent_id: Id,
    subitems: Id[],
    title: string,
    note: string
}
namespace Item {
    const items: { [id: string]: Item } = {}
    export function exists(id: Id) { return id in items }
    export function create(id: Id, parent_id?: Id) { items[id] = { id, parent_id, subitems: [], title: "", note: "" } }
    export function get(id: Id) { return items[id] }
    export function update(id: Id, patch: (item: Item) => Item) { items[id] = patch(items[id]) }
    export function del(id: Id) { delete items[id] }
}
import assert = require("assert")
type Reducer = (input: string[]) => void
namespace Reducer {
    const reducers: Map<RegExp, Reducer> = new Map()
    export function define(regex: RegExp, reducer: Reducer) { reducers.set(regex, reducer) }
}
Reducer.define(
    /Outline (.+) was created/,
    ([ item_id ]) => {
        assert(!Item.exists(item_id))
        Item.create(item_id)
        assert(Item.exists(item_id))
    }
)
Reducer.define(
    /Item (.+) was created inside item (.+) at position (.+)/,
    ([ new_item_id, parent_item_id, position_str ]) => {
        assert(Item.exists(parent_item_id))
        assert(!Item.exists(new_item_id))
        const position = Number.parseInt(position_str)
        assert(position.toString() === position_str)
        assert(!isNaN(position))
        Item.create(new_item_id, parent_item_id)
        Item.update(parent_item_id, parent_item => ({
            ...parent_item,
            subitems: [
                ...parent_item.subitems.slice(0, position),
                new_item_id,
                ...parent_item.subitems.slice(position)
            ]
        }))
        assert(Item.exists(new_item_id))
        assert(new_item_id in Item.get(parent_item_id).subitems)
    }
)
Reducer.define(
    /Item (.+)'s title was changed to (".+")/,
    ([ item_id, encoded_title ]) => {
        assert(Item.exists(item_id))
        const title = JSON.parse(encoded_title)
        assert(typeof title === "string")
        assert(title.indexOf("\n") === -1)
        Item.update(item_id, item => ({
            ...item,
            title
        }))
        assert(Item.get(item_id).title === title)
    }
)
Reducer.define(
    /Item (.+)'s note was changed to (".+")/,
    ([ item_id, encoded_note ]) => {
        assert(Item.exists(item_id))
        const note = JSON.parse(encoded_note)
        assert(typeof note === "string")
        Item.update(item_id, item => ({
            ...item,
            note
        }))
        assert(Item.get(item_id).note === note)
    }
)
Reducer.define(
    /Outline (.+) was deleted/,
    ([ item_id, parent_item_id ]) => {
        assert(Item.exists(item_id))
        assert(!Item.get(item_id).parent_id)
        Item.del(item_id)
        assert(!Item.exists(item_id))
    }
)
Reducer.define(
    /Item (.+) was deleted/,
    ([ item_id ]) => {
        assert(Item.exists(item_id))
        const parent_id = Item.get(item_id).parent_id
        assert(Item.exists(parent_id))
        Item.update(parent_id, item => {
            return {
                ...item,
                subitems: item.subitems.filter(id => id !== item_id)
            }
        })
        Item.del(item_id)
        assert(!Item.get(parent_id).subitems.includes(item_id))
        assert(!Item.exists(item_id))
    }
)
Reducer.define(
    /Item (.+) was moved inside item (.+) at position (.+)/,
    ([ item_id, new_parent_id, position_str ]) => {
        assert(Item.exists(item_id))
        assert(Item.exists(new_parent_id))
        const old_parent_id = Item.get(item_id).parent_id
        assert(Item.exists(old_parent_id))
        const position = Number.parseInt(position_str)
        assert(position.toString() === position_str)
        assert(!isNaN(position))
        Item.update(item_id, item => ({
            ...item,
            parent_id: new_parent_id
        }))
        Item.update(old_parent_id, old_parent_item => {
            return {
                ...old_parent_item,
                subitems: old_parent_item.subitems.filter(id => id !== item_id)
            }
        })
        Item.update(new_parent_id, new_parent_item => ({
            ...new_parent_item,
            subitems: [
                ...new_parent_item.subitems.slice(0, position),
                item_id,
                ...new_parent_item.subitems.slice(position)
            ]
        }))
        assert(!Item.get(old_parent_id).subitems.includes(item_id))
        assert(Item.get(new_parent_id).subitems.includes(item_id))
    }
)
